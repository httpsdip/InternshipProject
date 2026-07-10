import jwt
import hashlib
import secrets
from fastapi import FastAPI, Query, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta

from app.database import get_db_connection, init_db
from app.amfi_fetcher import fetch_amfi_nav
from app.ai_advisor import analyze_fund_risk, analyze_news_impact

app = FastAPI(
    title="AI Mutual Fund Analyzer Backend API",
    description="Full-stack database auth system, AMFI scraper, and Gemini-based Hinglish investment/news analyzer."
)

# Startup DB Initialization
@app.on_event("startup")
def startup_event():
    init_db()

# CORS Middleware config
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Auth Configurations
SECRET_KEY = "AI_MUTUAL_FUND_ANALYZER_SECRET_KEY"
ALGORITHM = "HS256"

# Request Models
class UserRegister(BaseModel):
    name: str
    email: EmailStr
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserRiskProfile(BaseModel):
    age: int
    investment_horizon: str
    risk_tolerance: str

class RiskAnalysisRequest(BaseModel):
    fund_data: Dict[str, Any]
    user_profile: UserRiskProfile

class BuyRequest(BaseModel):
    fund_id: str
    fund_name: str
    amount: float
    purchase_nav: float
    category: str
    return3Y: str

# Helper Authentication functions
def get_password_hash(password: str) -> str:
    # PBKDF2 style salted hashing
    salt = secrets.token_hex(16)
    hash_obj = hashlib.sha256((salt + password).encode())
    hashed = hash_obj.hexdigest()
    return f"{salt}:{hashed}"

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        salt, hashed = hashed_password.split(":")
        hash_obj = hashlib.sha256((salt + plain_password).encode())
        return hash_obj.hexdigest() == hashed
    except Exception:
        return False

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=7)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def get_current_user_id(authorization: Optional[str] = Header(None)) -> int:
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header is missing.")
    
    try:
        # Expected header format: "Bearer <token>"
        token = authorization.split(" ")[1] if " " in authorization else authorization
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: int = payload.get("user_id")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid authorization payload.")
        return user_id
    except Exception:
        raise HTTPException(status_code=401, detail="Session expired or invalid token. Please login again.")

# --- ROUTES ---

@app.get("/")
def health():
    return {"status": "active", "db": "SQLite connected"}

# 1. AUTHENTICATION ROUTERS
@app.post("/api/auth/register")
def register(user: UserRegister):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Check if user already exists
    cursor.execute("SELECT id FROM users WHERE email = ?", (user.email,))
    if cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=400, detail="This email is already registered.")
        
    hashed_pwd = get_password_hash(user.password)
    try:
        cursor.execute(
            "INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)",
            (user.name, user.email, hashed_pwd)
        )
        conn.commit()
    except Exception as e:
        conn.close()
        raise HTTPException(status_code=500, detail=f"Database registration error: {e}")
        
    conn.close()
    return {"status": "success", "message": "Account created successfully. You can now login!"}

@app.post("/api/auth/login")
def login(credentials: UserLogin):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("SELECT id, name, email, password_hash FROM users WHERE email = ?", (credentials.email,))
    user = cursor.fetchone()
    conn.close()
    
    if not user or not verify_password(credentials.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Incorrect email or password.")
        
    token = create_access_token({"user_id": user["id"], "email": user["email"]})
    return {
        "status": "success",
        "token": token,
        "user": {
            "id": user["id"],
            "name": user["name"],
            "email": user["email"]
        }
    }

# 2. EXPLORER INDICES & FUNDS
@app.get("/api/indices")
def get_indices():
    STOCK_INDICES = [
      {"name": "NIFTY BANK", "value": "48,125.40", "change": "-0.3%", "up": False},
      {"name": "GOLD", "value": "72,400.00", "change": "+2.1%", "up": True},
      {"name": "USD/INR", "value": "83.45", "change": "-0.1%", "up": False},
      {"name": "NASDAQ", "value": "16,215.10", "change": "+1.5%", "up": True},
      {"name": "NIFTY 50", "value": "22,453.30", "change": "+1.2%", "up": True},
      {"name": "SENSEX", "value": "74,012.15", "change": "+0.8%", "up": True},
      {"name": "NIFTY IT", "value": "38,150.20", "change": "-0.5%", "up": False},
      {"name": "CRUDE OIL", "value": "81.25", "change": "+1.8%", "up": True}
    ]
    return STOCK_INDICES

@app.get("/api/funds")
def get_funds(
    category: Optional[str] = Query("All"),
    search: Optional[str] = Query("")
):
    funds = fetch_amfi_nav()
    filtered = []
    for f in funds:
        if category != "All" and f["category"] != category:
            continue
        if search and search.lower() not in f["name"].lower() and search.lower() not in f["type"].lower():
            continue
        filtered.append(f)
    return filtered

# 3. AI RISK EVALUATION
@app.post("/api/analyze-risk")
def analyze_risk(request: RiskAnalysisRequest, user_id: int = Depends(get_current_user_id)):
    """Locked behind session authentication, returns advisory report in Hinglish."""
    return analyze_fund_risk(request.fund_data, {
        "age": request.user_profile.age,
        "investment_horizon": request.user_profile.investment_horizon,
        "risk_tolerance": request.user_profile.risk_tolerance
    })

# 4. DATABASE USER PORTFOLIO ROUTES
@app.get("/api/portfolio")
def get_portfolio(user_id: int = Depends(get_current_user_id)):
    """Fetch user portfolio, automatically re-calculating values using live NAVs from AMFI!"""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT id, fund_id, fund_name, units, invested_value, purchase_nav, category, return3Y 
        FROM portfolios WHERE user_id = ?
    """, (user_id,))
    rows = cursor.fetchall()
    conn.close()
    
    # Fetch live NAVs to calculate current value and profit/loss
    live_funds = fetch_amfi_nav()
    nav_map = {f["id"]: float(f["nav"]) for f in live_funds}
    
    portfolio_list = []
    for r in rows:
        fund_id = r["fund_id"]
        # Use live NAV if available, else fallback to purchase NAV
        current_nav = nav_map.get(fund_id, r["purchase_nav"])
        current_value = r["units"] * current_nav
        pnl = current_value - r["invested_value"]
        pnl_percent = (pnl / r["invested_value"] * 100) if r["invested_value"] > 0 else 0
        
        portfolio_list.append({
            "id": r["id"],
            "fund_id": fund_id,
            "fund_name": r["fund_name"],
            "units": round(r["units"], 4),
            "invested_value": round(r["invested_value"], 2),
            "purchase_nav": r["purchase_nav"],
            "current_nav": current_nav,
            "current_value": round(current_value, 2),
            "pnl": round(pnl, 2),
            "pnl_percent": round(pnl_percent, 2),
            "category": r["category"],
            "return3Y": r["return3Y"]
        })
        
    return portfolio_list

@app.post("/api/portfolio/buy")
def buy_fund(purchase: BuyRequest, user_id: int = Depends(get_current_user_id)):
    """Buy/purchase units and store them in the user specific SQLite portfolio."""
    if purchase.amount <= 0 or purchase.purchase_nav <= 0:
        raise HTTPException(status_code=400, detail="Invalid amount or NAV price.")
        
    units_bought = purchase.amount / purchase.purchase_nav
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Check if the user already holds this mutual fund
    cursor.execute(
        "SELECT id, units, invested_value FROM portfolios WHERE user_id = ? AND fund_id = ?",
        (user_id, purchase.fund_id)
    )
    existing = cursor.fetchone()
    
    if existing:
        new_units = existing["units"] + units_bought
        new_invested = existing["invested_value"] + purchase.amount
        # Weighted average purchase NAV
        new_avg_nav = new_invested / new_units
        
        cursor.execute("""
            UPDATE portfolios 
            SET units = ?, invested_value = ?, purchase_nav = ? 
            WHERE id = ?
        """, (new_units, new_invested, new_avg_nav, existing["id"]))
    else:
        cursor.execute("""
            INSERT INTO portfolios (user_id, fund_id, fund_name, units, invested_value, purchase_nav, category, return3Y)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            user_id, purchase.fund_id, purchase.fund_name, 
            units_bought, purchase.amount, purchase.purchase_nav, 
            purchase.category, purchase.return3Y
        ))
        
    conn.commit()
    conn.close()
    return {"status": "success", "message": f"Successfully invested {purchase.amount} into {purchase.fund_name}!"}

@app.delete("/api/portfolio/sell/{holding_id}")
def sell_fund(holding_id: int, user_id: int = Depends(get_current_user_id)):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Verify holding belongs to logged-in user
    cursor.execute("SELECT id FROM portfolios WHERE id = ? AND user_id = ?", (holding_id, user_id))
    holding = cursor.fetchone()
    
    if not holding:
        conn.close()
        raise HTTPException(status_code=404, detail="Holding record not found or unauthorized.")
        
    cursor.execute("DELETE FROM portfolios WHERE id = ?", (holding_id,))
    conn.commit()
    conn.close()
    return {"status": "success", "message": "Holding sold successfully."}

# 5. MARKET NEWS & AI SIGNAL RECOMMENDATIONS
@app.get("/api/news")
def get_news(user_id: int = Depends(get_current_user_id)):
    """Fetch seeded market news updates."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, title, content, category, published_at FROM news ORDER BY id DESC")
    rows = cursor.fetchall()
    conn.close()
    
    return [dict(r) for r in rows]

@app.post("/api/news/{news_id}/analyze")
def analyze_news(news_id: int, user_id: int = Depends(get_current_user_id)):
    """Triggers Gemini to read market news and recommend matching funds, in Hinglish."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT title, content, category FROM news WHERE id = ?", (news_id,))
    article = cursor.fetchone()
    conn.close()
    
    if not article:
        raise HTTPException(status_code=404, detail="News article not found.")
        
    # Get live funds from AMFI to supply context for recommendations
    funds_pool = fetch_amfi_nav()
    
    # Run analysis
    report = analyze_news_impact(
        article["title"],
        article["content"],
        article["category"],
        funds_pool
    )
    return report

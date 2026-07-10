import requests
import re
from typing import List, Dict, Any

# Top best-performing curated mutual funds list with their official MFAPI.in scheme codes
TOP_FUNDS_METADATA = [
  {
    "id": "120590", # Parag Parikh Flexi Cap Fund
    "category": "Equity",
    "type": "Flexi Cap",
    "risk": "Very High",
    "return1Y": "26.4%",
    "return3Y": "24.8%",
    "expenseRatio": "0.65%",
    "aum": "₹52,400 Cr",
    "minSip": 1000
  },
  {
    "id": "122639", # HDFC Mid-Cap Opportunities Fund
    "category": "Equity",
    "type": "Mid Cap",
    "risk": "Very High",
    "return1Y": "33.8%",
    "return3Y": "31.5%",
    "expenseRatio": "0.85%",
    "aum": "₹61,000 Cr",
    "minSip": 500
  },
  {
    "id": "125350", # SBI Small Cap Fund
    "category": "Equity",
    "type": "Small Cap",
    "risk": "Very High",
    "return1Y": "36.1%",
    "return3Y": "34.2%",
    "expenseRatio": "0.70%",
    "aum": "₹28,600 Cr",
    "minSip": 500
  },
  {
    "id": "128790", # Tata Digital India Fund
    "category": "Equity",
    "type": "Sectoral - Tech",
    "risk": "Very High",
    "return1Y": "21.2%",
    "return3Y": "22.4%",
    "expenseRatio": "0.78%",
    "aum": "₹9,800 Cr",
    "minSip": 500
  },
  {
    "id": "119551", # ABSL Frontline Equity Fund
    "category": "Equity",
    "type": "Large Cap",
    "risk": "High",
    "return1Y": "19.5%",
    "return3Y": "18.2%",
    "expenseRatio": "0.90%",
    "aum": "₹26,400 Cr",
    "minSip": 1000
  },
  {
    "id": "119800", # ABSL Corporate Bond Fund
    "category": "Debt",
    "type": "Corporate Bond",
    "risk": "Low",
    "return1Y": "7.8%",
    "return3Y": "7.2%",
    "expenseRatio": "0.35%",
    "aum": "₹18,400 Cr",
    "minSip": 1000
  },
  {
    "id": "120843", # Nippon India Arbitrage Fund
    "category": "Hybrid",
    "type": "Arbitrage",
    "risk": "Low",
    "return1Y": "6.9%",
    "return3Y": "6.1%",
    "expenseRatio": "0.40%",
    "aum": "₹22,100 Cr",
    "minSip": 500
  },
  {
    "id": "130450", # Kotak Equity Hybrid Fund
    "category": "Hybrid",
    "type": "Aggressive Hybrid",
    "risk": "Moderate",
    "return1Y": "15.4%",
    "return3Y": "14.2%",
    "expenseRatio": "0.75%",
    "aum": "₹12,800 Cr",
    "minSip": 1000
  },
  {
    "id": "120719", # ICICI Prudential Bluechip Fund
    "category": "Equity",
    "type": "Large Cap",
    "risk": "High",
    "return1Y": "22.3%",
    "return3Y": "19.8%",
    "expenseRatio": "0.82%",
    "aum": "₹44,300 Cr",
    "minSip": 1000
  },
  {
    "id": "148967", # Quant Small Cap Fund
    "category": "Equity",
    "type": "Small Cap",
    "risk": "Very High",
    "return1Y": "42.1%",
    "return3Y": "38.5%",
    "expenseRatio": "0.77%",
    "aum": "₹17,200 Cr",
    "minSip": 500
  }
]

# Cache to prevent hitting the external API too frequently
_MFAPI_CACHE = []

def fetch_amfi_nav() -> List[Dict[str, Any]]:
    """
    Fetches real-time mutual fund NAVs from the open-source MFAPI.in REST API.
    Provides a cleaner, faster JSON-based alternative to AMFI's raw text files.
    """
    global _MFAPI_CACHE
    if _MFAPI_CACHE:
        return _MFAPI_CACHE

    fetched_funds = []
    session = requests.Session()

    for metadata in TOP_FUNDS_METADATA:
        scheme_code = metadata["id"]
        url = f"https://api.mfapi.in/mf/{scheme_code}"
        try:
            # Safe 5-second timeout to keep the dashboard responsive
            res = session.get(url, timeout=5)
            if res.status_code == 200:
                json_data = res.json()
                meta = json_data.get("meta", {})
                data_list = json_data.get("data", [])
                
                # Retrieve the latest NAV from the data history
                latest_nav = "100.00"
                if data_list:
                    latest_nav = data_list[0].get("nav", "100.00")
                
                fetched_funds.append({
                    "id": scheme_code,
                    "name": meta.get("scheme_name", "Unknown Mutual Fund Scheme"),
                    "category": metadata["category"],
                    "type": metadata["type"],
                    "risk": metadata["risk"],
                    "return1Y": metadata["return1Y"],
                    "return3Y": metadata["return3Y"],
                    "nav": latest_nav,
                    "expenseRatio": metadata["expenseRatio"],
                    "aum": metadata["aum"],
                    "minSip": metadata["minSip"]
                })
            else:
                raise Exception("Non-200 response")
        except Exception as e:
            print(f"MFAPI Fetch failed for {scheme_code}: {e}. Loading safe default values.")
            # Fallback values from local configuration metadata
            fetched_funds.append({
                "id": scheme_code,
                "name": get_fallback_fund_name(scheme_code),
                "category": metadata["category"],
                "type": metadata["type"],
                "risk": metadata["risk"],
                "return1Y": metadata["return1Y"],
                "return3Y": metadata["return3Y"],
                "nav": get_fallback_nav(scheme_code),
                "expenseRatio": metadata["expenseRatio"],
                "aum": metadata["aum"],
                "minSip": metadata["minSip"]
            })

    _MFAPI_CACHE = fetched_funds
    return fetched_funds

def get_fallback_fund_name(code: str) -> str:
    names = {
        "120590": "Parag Parikh Flexi Cap Fund - Direct Plan - Growth",
        "122639": "HDFC Mid-Cap Opportunities Fund - Direct Plan - Growth",
        "125350": "SBI Small Cap Fund - Direct Plan - Growth",
        "128790": "Tata Digital India Fund - Direct Plan - Growth",
        "119551": "Aditya Birla Sun Life Frontline Equity Fund - Growth - Direct Plan",
        "119800": "Aditya Birla Sun Life Corporate Bond Fund - Direct Plan - Growth",
        "120843": "Nippon India Arbitrage Fund - Direct Plan - Growth",
        "130450": "Kotak Equity Hybrid Fund - Direct Plan - Growth",
        "120719": "ICICI Prudential Bluechip Fund - Direct Plan - Growth",
        "148967": "Quant Small Cap Fund - Direct Plan - Growth"
    }
    return names.get(code, "Curated Mutual Fund Scheme")

def get_fallback_nav(code: str) -> str:
    navs = {
        "120590": "85.60",
        "122639": "164.20",
        "125350": "195.10",
        "128790": "62.30",
        "119551": "455.51",
        "119800": "32.40",
        "120843": "45.85",
        "130450": "48.20",
        "120719": "88.10",
        "148967": "210.40"
    }
    return navs.get(code, "100.00")

import os
import json
import re
from typing import Dict, Any, List

def get_fallback_analysis_hinglish(fund: Dict[str, Any], profile: Dict[str, Any]) -> Dict[str, Any]:
    """
    Structured heuristic rules engine returning friendly, conversational Hinglish analysis.
    This acts as the local "Normal AI" advisor.
    """
    age = int(profile.get("age", 30))
    horizon = profile.get("investment_horizon", "3-5 years")
    risk_pref = profile.get("risk_tolerance", "Moderate")
    
    fund_risk = fund.get("risk", "High")
    fund_category = fund.get("category", "Equity")
    fund_name = fund.get("name", "Selected Fund")
    
    verdict = "RECOMMENDED"
    reason = "Yeh fund aapki profile ke sath match karta hai."
    score = 8
    pros = []
    cons = []
    alternative = ""
    
    if horizon == "Less than 1 year":
        if fund_risk in ["High", "Very High"] or fund_category == "Equity":
            verdict = "NOT RECOMMENDED"
            reason = "1 saal se kam time ke liye high-risk equity funds bilkul safe nahi hain. Market fluctuations se nuksan ho sakta hai."
            score = 2
            alternative = "Aap iske badle Liquid Funds ya Arbitrage Funds mein invest karein jisme risk kam hota hai."
        else:
            verdict = "PROCEED WITH CAUTION"
            reason = "Debt funds mein short term mein safe returns mil sakte hain par entry-exit load ka dhyan rakhein."
            score = 6
            alternative = "Overnight funds check karein, vo short timeline ke liye safe hote hain."
            
    elif horizon == "1-3 years":
        if fund_risk in ["Very High"] or "Small" in fund_name or "Mid" in fund_name:
            verdict = "NOT RECOMMENDED"
            reason = "Small aur Mid Cap funds ko grow karne ke liye kam se kam 5 se 7 saal chahiye hote hain. 1-3 saal mein inme bada loss ho sakta hai."
            score = 3
            alternative = "Aap Hybrid (Balanced Advantage) ya Short Term Debt funds check karein."
        elif fund_risk == "High" or fund_category == "Equity":
            verdict = "PROCEED WITH CAUTION"
            reason = "3 saal ka time standard hai par agar market girta hai toh recover hone mein time lag sakta hai."
            score = 6
            alternative = "Large Cap Index funds ya Conservative Hybrid funds mein invest karna behtar rahega."
            
    elif horizon == "5+ years":
        if risk_pref == "Low":
            if fund_risk in ["High", "Very High"]:
                verdict = "PROCEED WITH CAUTION"
                reason = "Aapka investment horizon lamba hai par risk tolerance kam hai, isliye zyada volatility se aap tension mein aa sakte hain."
                score = 5
                alternative = "Large-cap index funds ya Balanced Hybrid funds mein jayein jahan return ke sath safe play ho sake."
            else:
                verdict = "RECOMMENDED"
                reason = "Lambe samay ke liye moderate/low risk debt/hybrid funds stable growth de sakte hain."
                score = 9
        else:
            verdict = "RECOMMENDED"
            reason = "Bahut badiya! 5 saal se upar ka time small, mid ya flexi-cap funds mein compound growth ke liye best hota hai."
            score = 9.5
            
    if fund_category == "Equity":
        pros.append("Long term mein inflation ko beat karne ke liye sabse accha option hai.")
        pros.append(f"Is fund ka 3-year return record stable {fund.get('return3Y', '15%')} return dikhata hai.")
        cons.append("Short term mein market ke upar-niche hone se loss ka darr rehta hai.")
        if fund_risk == "Very High":
            cons.append("Volatile NAV: isme up-down ka fluctuation bohot sharp hota hai.")
    else:
        pros.append("Safe portfolio growth, low risk aur liquidity.")
        pros.append("Equity market crash hone par aapke portfolio ko protect karega.")
        cons.append("Tax-adjusted returns bank FD se thode hi behtar hote hain.")
        
    if age > 55 and fund_risk in ["High", "Very High"]:
        verdict = "PROCEED WITH CAUTION"
        reason = f"Aapki age {age} saal hai, is stage par capital preservation (paisa bachana) priority honi chahiye. Itna high risk mutual fund aapko avoid karna chahiye."
        score = min(score, 5)
        alternative = "Conservative hybrid ya dynamic asset allocation funds check karein."

    summary = (
        f"Aapki age {age} saal hai, aapka investment time {horizon} hai, aur aapka risk preference {risk_pref} hai. "
        f"Yeh fund '{fund_name}' ek {fund_risk} risk wala {fund_category} category fund hai. "
        f"Hamari report ke mutabik: {reason} Is suitability score ko hum 10 mein se {score} rating dete hain."
    )
    
    return {
        "verdict": verdict,
        "verdict_reason": reason,
        "risk_suitability_score": score,
        "pros": pros,
        "cons": cons,
        "alternative_suggestion": alternative,
        "analysis_summary": summary
    }

def analyze_fund_risk(fund_data: Dict[str, Any], user_profile: Dict[str, Any]) -> Dict[str, Any]:
    """
    Local heuristic risk analyzer. Always returns instant rules-based output.
    """
    return get_fallback_analysis_hinglish(fund_data, user_profile)

def analyze_news_impact(news_title: str, news_content: str, news_category: str, funds_list: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Local rules engine matching categories of funds to market news headlines.
    """
    impact_summary = f"News update: '{news_title}' se market sector par direct impact padega. Industry liquidity and valuations change hone ki sambhavna hai."
    suggested = []
    
    # Analyze the news content locally and map matching recommendations
    for fund in funds_list[:3]: # Grab top 3 funds
        verdict = "BUY"
        reason = "Yeh fund sector growth aur direct NAV ratios ke hisab se safe and stable investment lag raha hai."
        
        # News mapping heuristics
        if "Debt" in news_category or "Repo" in news_title or "Interest" in news_title:
            if fund["category"] == "Debt":
                verdict = "BUY"
                reason = "RBI Repo rate updates aur global interest dynamics debt markets ko stabilize karenge, jisse is low-risk fund mein fixed returns acche milenge."
            else:
                verdict = "HOLD"
                reason = "Market indicators interest volatility ko evaluate kar rahe hain, isliye equity holding ko hold karein."
        elif "Infrastructure" in news_title or "Capex" in news_title or "Budget" in news_title:
            if "Mid-Cap" in fund["type"] or "Large Cap" in fund["type"] or "Flexi Cap" in fund["type"]:
                verdict = "BUY"
                reason = "Govt Capex spending badhne se manufacturing aur construction industries ko strong support milega, jisse equity returns rise honge."
        elif "Tech" in news_title or "Digital" in news_title or "IT" in news_title:
            if "Tech" in fund["type"] or "Digital" in fund["name"]:
                verdict = "BUY"
                reason = "New technical deals aur global digital adoption se information technology shares boost honge, isliye buy opportunity hai."
            elif "Small" in fund["type"]:
                verdict = "AVOID"
                reason = "Sector shifts ke time small caps mein volatility bohot fast increase ho sakti hai, thoda warning rakhein."

        suggested.append({
            "fund_id": fund["id"],
            "fund_name": fund["name"],
            "verdict": verdict,
            "reason": reason
        })
        
    return {
        "impact_summary": impact_summary,
        "suggested_funds": suggested
    }

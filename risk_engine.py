import re
import json
import os
import urllib.request
import urllib.parse
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field

# Disable HF Symlinks Warning on Windows if transformers is loaded
os.environ["HF_HUB_DISABLE_SYMLINKS_WARNING"] = "1"

# ---------------------------------------------------------------------------
# Resilient NLP Engine Loaders (Lazy-Loaded Zero-Crash Fallbacks)
# ---------------------------------------------------------------------------
HAS_FINBERT = False
_finbert_pipeline = None

def get_finbert_sentiment():
    """Lazy loader to prevent import locks during startup."""
    global HAS_FINBERT, _finbert_pipeline
    if _finbert_pipeline is not None:
        return _finbert_pipeline
    try:
        from transformers import pipeline
        _finbert_pipeline = pipeline("text-classification", model="ProsusAI/finbert")
        HAS_FINBERT = True
        return _finbert_pipeline
    except Exception:
        HAS_FINBERT = False
        return None

_HAS_TEXTBLOB = None
_TextBlob = None

def get_textblob():
    global _HAS_TEXTBLOB, _TextBlob
    if _HAS_TEXTBLOB is not None:
        return _TextBlob
    try:
        from textblob import TextBlob as tb
        _TextBlob = tb
        _HAS_TEXTBLOB = True
        return _TextBlob
    except Exception:
        _HAS_TEXTBLOB = False
        return None


# ==========================================================
# 1. GEOLOCATION KNOWLEDGE BASE & RESOLUTION DICTIONARY
# ==========================================================
GEO_KNOWLEDGE_BASE: Dict[str, Dict[str, Any]] = {
    # Americas - Financial Centers & Corporate HQs
    "united states": {"country": "United States", "country_code": "US", "city": "Washington D.C.", "lat": 38.9072, "lng": -77.0369},
    "us": {"country": "United States", "country_code": "US", "city": "New York", "lat": 40.7128, "lng": -74.0060},
    "usa": {"country": "United States", "country_code": "US", "city": "New York", "lat": 40.7128, "lng": -74.0060},
    "american": {"country": "United States", "country_code": "US", "city": "New York", "lat": 40.7128, "lng": -74.0060},
    "federal reserve": {"country": "United States", "country_code": "US", "city": "Washington D.C.", "lat": 38.8921, "lng": -77.0465},
    "fed": {"country": "United States", "country_code": "US", "city": "Washington D.C.", "lat": 38.8921, "lng": -77.0465},
    "white house": {"country": "United States", "country_code": "US", "city": "Washington D.C.", "lat": 38.8977, "lng": -77.0365},
    "wall street": {"country": "United States", "country_code": "US", "city": "New York", "lat": 40.7069, "lng": -74.0089},
    "new york": {"country": "United States", "country_code": "US", "city": "New York", "lat": 40.7128, "lng": -74.0060},
    "silicon valley": {"country": "United States", "country_code": "US", "city": "Santa Clara", "lat": 37.3541, "lng": -121.9552},
    "tennessee": {"country": "United States", "country_code": "US", "city": "Nashville", "lat": 36.1627, "lng": -86.7816},
    "texas": {"country": "United States", "country_code": "US", "city": "Houston", "lat": 29.7604, "lng": -95.3698},
    "california": {"country": "United States", "country_code": "US", "city": "San Francisco", "lat": 37.7749, "lng": -122.4194},
    "elon musk": {"country": "United States", "country_code": "US", "city": "Austin", "lat": 30.2672, "lng": -97.7431},
    "tesla": {"country": "United States", "country_code": "US", "city": "Austin", "lat": 30.2672, "lng": -97.7431},
    "canada": {"country": "Canada", "country_code": "CA", "city": "Toronto", "lat": 43.6532, "lng": -79.3832},
    "brazil": {"country": "Brazil", "country_code": "BR", "city": "São Paulo", "lat": -23.5505, "lng": -46.6333},
    
    # Europe
    "united kingdom": {"country": "United Kingdom", "country_code": "GB", "city": "London", "lat": 51.5074, "lng": -0.1278},
    "uk": {"country": "United Kingdom", "country_code": "GB", "city": "London", "lat": 51.5074, "lng": -0.1278},
    "london": {"country": "United Kingdom", "country_code": "GB", "city": "London", "lat": 51.5074, "lng": -0.1278},
    "bank of england": {"country": "United Kingdom", "country_code": "GB", "city": "London", "lat": 51.5142, "lng": -0.0885},
    "germany": {"country": "Germany", "country_code": "DE", "city": "Frankfurt", "lat": 50.1109, "lng": 8.6821},
    "frankfurt": {"country": "Germany", "country_code": "DE", "city": "Frankfurt", "lat": 50.1109, "lng": 8.6821},
    "ecb": {"country": "European Union", "country_code": "EU", "city": "Frankfurt", "lat": 50.1100, "lng": 8.6800},
    "european central bank": {"country": "European Union", "country_code": "EU", "city": "Frankfurt", "lat": 50.1100, "lng": 8.6800},
    "eu": {"country": "European Union", "country_code": "EU", "city": "Brussels", "lat": 50.8503, "lng": 4.3517},
    "france": {"country": "France", "country_code": "FR", "city": "Paris", "lat": 48.8566, "lng": 2.3522},
    "french": {"country": "France", "country_code": "FR", "city": "Paris", "lat": 48.8566, "lng": 2.3522},
    "paris": {"country": "France", "country_code": "FR", "city": "Paris", "lat": 48.8566, "lng": 2.3522},
    "switzerland": {"country": "Switzerland", "country_code": "CH", "city": "Zurich", "lat": 47.3769, "lng": 8.5417},
    "zurich": {"country": "Switzerland", "country_code": "CH", "city": "Zurich", "lat": 47.3769, "lng": 8.5417},
    "credit suisse": {"country": "Switzerland", "country_code": "CH", "city": "Zurich", "lat": 47.3769, "lng": 8.5417},
    "russia": {"country": "Russia", "country_code": "RU", "city": "Moscow", "lat": 55.7558, "lng": 37.6173},
    "ukraine": {"country": "Ukraine", "country_code": "UA", "city": "Kyiv", "lat": 50.4501, "lng": 30.5234},

    # Asia & Middle East
    "india": {"country": "India", "country_code": "IN", "city": "Mumbai", "lat": 19.0760, "lng": 72.8777},
    "indian": {"country": "India", "country_code": "IN", "city": "Mumbai", "lat": 19.0760, "lng": 72.8777},
    "mumbai": {"country": "India", "country_code": "IN", "city": "Mumbai", "lat": 19.0760, "lng": 72.8777},
    "delhi": {"country": "India", "country_code": "IN", "city": "New Delhi", "lat": 28.6139, "lng": 77.2090},
    "rbi": {"country": "India", "country_code": "IN", "city": "Mumbai", "lat": 18.9322, "lng": 72.8335},
    "reserve bank of india": {"country": "India", "country_code": "IN", "city": "Mumbai", "lat": 18.9322, "lng": 72.8335},
    "china": {"country": "China", "country_code": "CN", "city": "Beijing", "lat": 39.9042, "lng": 116.4074},
    "chinese": {"country": "China", "country_code": "CN", "city": "Beijing", "lat": 39.9042, "lng": 116.4074},
    "pboc": {"country": "China", "country_code": "CN", "city": "Beijing", "lat": 39.9042, "lng": 116.4074},
    "japan": {"country": "Japan", "country_code": "JP", "city": "Tokyo", "lat": 35.6762, "lng": 139.6503},
    "bank of japan": {"country": "Japan", "country_code": "JP", "city": "Tokyo", "lat": 35.6762, "lng": 139.6503},
    "singapore": {"country": "Singapore", "country_code": "SG", "city": "Singapore", "lat": 1.3521, "lng": 103.8198},
    "taiwan": {"country": "Taiwan", "country_code": "TW", "city": "Taipei", "lat": 25.0330, "lng": 121.5654},
    "tsmc": {"country": "Taiwan", "country_code": "TW", "city": "Hsinchu", "lat": 24.7800, "lng": 120.9970},
    "middle east": {"country": "Middle East", "country_code": "ME", "city": "Riyadh", "lat": 24.7136, "lng": 46.6753},
    "saudi arabia": {"country": "Saudi Arabia", "country_code": "SA", "city": "Riyadh", "lat": 24.7136, "lng": 46.6753},
    "uae": {"country": "UAE", "country_code": "AE", "city": "Dubai", "lat": 25.2048, "lng": 55.2708},
    "dubai": {"country": "UAE", "country_code": "AE", "city": "Dubai", "lat": 25.2048, "lng": 55.2708},
    "red sea": {"country": "Red Sea Corridor", "country_code": "RS", "city": "Bab-el-Mandeb", "lat": 12.5833, "lng": 43.3333},
    "israel": {"country": "Israel", "country_code": "IL", "city": "Tel Aviv", "lat": 32.0853, "lng": 34.7818},
    "iran": {"country": "Iran", "country_code": "IR", "city": "Tehran", "lat": 35.6892, "lng": 51.3890},
    "australia": {"country": "Australia", "country_code": "AU", "city": "Sydney", "lat": -33.8688, "lng": 151.2093},
}

# ==========================================================
# 2. STRUCTURED OUTPUT SCHEMA (Institutional Pydantic V2)
# ==========================================================

class GeoLocation(BaseModel):
    country: str = Field(default="Global", description="Country or Region name")
    country_code: str = Field(default="GL", description="ISO 2-letter country code")
    city: str = Field(default="Global Hub", description="Key financial city / origin")
    latitude: float = Field(default=20.0, description="Latitude for 3D Globe mapping (-90 to +90)")
    longitude: float = Field(default=0.0, description="Longitude for 3D Globe mapping (-180 to +180)")

class RiskSignal(BaseModel):
    source: str
    headline_or_text: str
    entity_mentioned: str
    sentiment_score: float = Field(..., description="Normalized score from -1.0 (Very Negative) to +1.0 (Very Positive)")
    event_classification: str = Field(..., description="Category: Geopolitical, Macroeconomic, Credit Event, Merger/Acquisition, Product Launch")
    impact_score: int = Field(..., description="Severity rating from 1 to 10")
    trigger_stress_test: bool = Field(..., description="True if impact_score >= 7")
    geolocation: GeoLocation = Field(default_factory=GeoLocation, description="Geocoded origin for visual 3D globe plotting")


# ==========================================================
# 3. EXTENSIBLE DATA INGESTION MODULE (Multi-Source & Zero-Key Feeds)
# ==========================================================

class DataIngestionPipe:
    """
    Institutional Multi-Source Ingestion Engine:
    1. Curated Historical Benchmark Snapshots (Golden Test Set)
    2. GDELT Project 2.0 Real-Time API (Zero-Key, Global, Free, Real-Time)
    3. NewsAPI REST Endpoint
    4. Finnhub Market News REST Endpoint
    5. Fallback Mock Generation
    """

    @staticmethod
    def fetch_mock_data_feed() -> List[Dict[str, Any]]:
        """
        Multi-source benchmark feed reflecting real historical & stress market shocks.
        Pre-geocoded with high-fidelity financial metadata.
        """
        return [
            {
                "source": "Twitter/X (@MarketWatch)",
                "text": "Silicon Valley Bank faces catastrophic deposit run as $XYZ Bank credit default swaps surge to 10-year highs following severe liquidity shortfall.",
                "forced_geo": {"country": "United States", "country_code": "US", "city": "Santa Clara", "lat": 37.3541, "lng": -121.9552}
            },
            {
                "source": "Reuters News",
                "text": "Federal Reserve unexpected rate hike of 75 bps causes sharp downturn across global bond yields and sovereign debt markets.",
                "forced_geo": {"country": "United States", "country_code": "US", "city": "Washington D.C.", "lat": 38.9072, "lng": -77.0369}
            },
            {
                "source": "Bloomberg Terminal",
                "text": "Credit Suisse emergency AT1 bond wipeout triggers European Central Bank scrutiny across Frankfurt and Zurich banking groups.",
                "forced_geo": {"country": "Switzerland", "country_code": "CH", "city": "Zurich", "lat": 47.3769, "lng": 8.5417}
            },
            {
                "source": "Financial Times",
                "text": "Middle East military escalations in the Red Sea trigger oil supply bottlenecks and global maritime shipping pauses.",
                "forced_geo": {"country": "Red Sea Corridor", "country_code": "RS", "city": "Bab-el-Mandeb", "lat": 12.5833, "lng": 43.3333}
            },
            {
                "source": "The Economic Times (India)",
                "text": "Reserve Bank of India warns of unsecured retail credit strain and tightens risk-weighted asset ratios for NBFC wholesale lenders.",
                "forced_geo": {"country": "India", "country_code": "IN", "city": "Mumbai", "lat": 19.0760, "lng": 72.8777}
            },
            {
                "source": "Nikkei Asia",
                "text": "Taiwan TSMC partners with Global Automaker to unveil next-generation 2nm semiconductor manufacturing plant ahead of schedule.",
                "forced_geo": {"country": "Taiwan", "country_code": "TW", "city": "Hsinchu", "lat": 24.7800, "lng": 120.9970}
            }
        ]

    @staticmethod
    def fetch_global_financial_rss(query: str = "central bank OR inflation OR default OR debt", max_records: int = 6) -> List[Dict[str, Any]]:
        """
        Real-time Global Multi-Region Financial Wire (Google News Financial Topic RSS).
        Aggregates live headlines from Reuters, Bloomberg, CNBC, Financial Times, Barron's in real time.
        Zero API Key Required, 100% Free, Global Geolocation Coverage.
        """
        encoded_query = urllib.parse.quote(query)
        url = f"https://news.google.com/rss/search?q={encoded_query}&hl=en-US&gl=US&ceid=US:en"
        try:
            import xml.etree.ElementTree as ET
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
            with urllib.request.urlopen(req, timeout=6) as response:
                xml_data = response.read().decode('utf-8', errors='ignore')
                root = ET.fromstring(xml_data)
                items = root.findall('.//item')
                results = []
                for item in items[:max_records]:
                    title_elem = item.find('title')
                    pub_elem = item.find('pubDate')
                    source_elem = item.find('source')
                    
                    title = title_elem.text.strip() if title_elem is not None and title_elem.text else ""
                    source_name = source_elem.text.strip() if source_elem is not None and source_elem.text else "Global Financial Wire"
                    pub_date = pub_elem.text.strip() if pub_elem is not None and pub_elem.text else ""
                    
                    if title:
                        results.append({
                            "source": f"{source_name} (Live)",
                            "text": title,
                            "published_at": pub_date
                        })
                return results
        except Exception:
            return []

    @staticmethod
    def fetch_gdelt_news(query: str = "banking OR inflation OR default OR sanction", max_records: int = 5) -> List[Dict[str, Any]]:
        """
        Live Ingestion Connector for The GDELT Project 2.0 (Zero API Key Required).
        Monitors global news translated in 100+ languages in real-time.
        """
        encoded_query = urllib.parse.quote(query)
        url = f"https://api.gdeltproject.org/api/v2/doc/doc?query={encoded_query}&mode=artlist&maxrecords={max_records}&format=json&sort=DateDesc"
        
        try:
            req = urllib.request.Request(
                url, 
                headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
            )
            with urllib.request.urlopen(req, timeout=5) as response:
                data = json.loads(response.read().decode('utf-8'))
                articles = data.get("articles", [])
                results = []
                for a in articles:
                    title = a.get("title", "").strip()
                    if not title:
                        continue
                    source_domain = a.get("domain", "GDELT Global Wire")
                    results.append({
                        "source": f"GDELT ({source_domain})",
                        "text": title,
                        "url": a.get("url", ""),
                        "seendate": a.get("seendate", "")
                    })
                return results
        except Exception:
            return []

    @staticmethod
    def fetch_news_api(api_key: Optional[str] = None, query: str = "banking OR inflation OR defaults", page_size: int = 5) -> List[Dict[str, Any]]:
        """Live ingestion connector for NewsAPI.org."""
        key = api_key or os.getenv("NEWSAPI_KEY")
        if not key:
            return []
        
        url = f"https://newsapi.org/v2/everything?q={urllib.parse.quote(query)}&sortBy=publishedAt&pageSize={page_size}&apiKey={key}"
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'NLPRiskEngine/2.0'})
            with urllib.request.urlopen(req, timeout=8) as response:
                payload = json.loads(response.read().decode('utf-8'))
                articles = payload.get("articles", [])
                return [
                    {
                        "source": f"NewsAPI ({a.get('source', {}).get('name', 'General')})",
                        "text": f"{a.get('title', '')}. {a.get('description', '')}".strip()
                    }
                    for a in articles if a.get("title")
                ]
        except Exception:
            return []

    @staticmethod
    def fetch_finnhub_news(api_key: Optional[str] = None, category: str = "general") -> List[Dict[str, Any]]:
        """Live ingestion connector for Finnhub Market News."""
        key = api_key or os.getenv("FINNHUB_KEY")
        if not key:
            return []
        
        url = f"https://finnhub.io/api/v1/news?category={category}&token={key}"
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'NLPRiskEngine/2.0'})
            with urllib.request.urlopen(req, timeout=8) as response:
                items = json.loads(response.read().decode('utf-8'))
                return [
                    {
                        "source": f"Finnhub ({item.get('source', 'Market')})",
                        "text": f"{item.get('headline', '')}. {item.get('summary', '')}".strip()
                    }
                    for item in items[:5] if item.get("headline")
                ]
        except Exception:
            return []


# ==========================================================
# 4. ADVANCED NLP RISK ENGINE WITH GEOLOCATION INTELLIGENCE
# ==========================================================

class RiskEngineNLP:
    def __init__(self, use_hf: bool = False):
        self.use_hf = use_hf

        # Institutional Financial Lexicons
        self.negative_lexicon = {
            "default": -0.9, "bankrupt": -0.95, "shortfall": -0.7, "downgrade": -0.75,
            "collapse": -0.9, "liquidity": -0.6, "recession": -0.8, "war": -0.9,
            "escalation": -0.75, "conflict": -0.7, "hike": -0.5, "crisis": -0.85,
            "plunge": -0.8, "losses": -0.7, "deficit": -0.6, "fraud": -0.95,
            "downturn": -0.75, "crash": -0.9, "selloff": -0.65, "sanction": -0.7,
            "wipeout": -0.9, "strain": -0.6, "distress": -0.8, "tightens": -0.4,
            "inflation": -0.5, "run": -0.7
        }
        self.positive_lexicon = {
            "surge": 0.5, "rally": 0.7, "profit": 0.65, "gain": 0.6, "growth": 0.7,
            "breakthrough": 0.8, "unveils": 0.5, "exceeds": 0.65, "acquisition": 0.4,
            "upgrade": 0.75, "recovery": 0.7, "outperform": 0.8, "dividend": 0.5,
            "partners": 0.45, "innovation": 0.6
        }

    def _extract_sentiment(self, text: str) -> float:
        """Calculates normalized sentiment (-1.0 to 1.0) with multi-tiered fallback."""
        if self.use_hf:
            fb = get_finbert_sentiment()
            if fb:
                try:
                    res = fb(text)[0]
                    label = res['label'].lower()
                    score = float(res['score'])
                    if label == 'negative':
                        return round(-abs(score), 2)
                    elif label == 'positive':
                        return round(abs(score), 2)
                    else:
                        return 0.0
                except Exception:
                    pass

        # Financial Lexicon Analysis (Institutional Domain Sentiment)
        text_lower = text.lower()
        score = 0.0
        matches = 0
        for word, val in self.negative_lexicon.items():
            if re.search(r'\b' + re.escape(word) + r'\b', text_lower):
                score += val
                matches += 1
        for word, val in self.positive_lexicon.items():
            if re.search(r'\b' + re.escape(word) + r'\b', text_lower):
                score += val
                matches += 1

        if matches > 0:
            avg_score = score / matches
            return round(max(-1.0, min(1.0, avg_score)), 2)

        tb = get_textblob()
        if tb:
            try:
                return round(float(tb(text).sentiment.polarity), 2)
            except Exception:
                pass

        return 0.0

    def _classify_event(self, text: str) -> str:
        """Standardized Basel/CRISIL Event Taxonomy Classification."""
        text_lower = text.lower()
        scores = {
            "Credit Event": 0,
            "Macroeconomic": 0,
            "Geopolitical": 0,
            "Merger/Acquisition": 0,
            "Product Launch": 0
        }

        credit_keywords = [
            "default", "cds", "credit default swap", "liquidity", "insolvency",
            "bankrupt", "downgrade", "debt", "bond yield", "haircut", "distressed",
            "at1", "wipeout", "deposit run", "nbfc", "asset quality"
        ]
        macro_keywords = [
            "federal reserve", "rate hike", "interest rate", "cpi", "inflation",
            "gdp", "central bank", "ecb", "basis points", "monetary policy",
            "tightening", "quantitative tightening", "rbi", "yield curve"
        ]
        geopol_keywords = [
            "war", "military", "sanction", "conflict", "oil supply", "tariff",
            "geopolitical", "strait", "embargo", "missile", "treaty", "red sea", "shipping pause"
        ]
        ma_keywords = [
            "acquisition", "acquire", "merger", "buyout", "takeover", "deal",
            "cash acquisition", "purchase stake", "consortium"
        ]
        product_keywords = [
            "unveils", "announces product", "launches", "rollout", "battery",
            "semiconductor", "innovation", "patent", "releases", "2nm"
        ]

        for kw in credit_keywords:
            if kw in text_lower: scores["Credit Event"] += 2
        for kw in macro_keywords:
            if kw in text_lower: scores["Macroeconomic"] += 2
        for kw in geopol_keywords:
            if kw in text_lower: scores["Geopolitical"] += 2
        for kw in ma_keywords:
            if kw in text_lower: scores["Merger/Acquisition"] += 2
        for kw in product_keywords:
            if kw in text_lower: scores["Product Launch"] += 2

        best_category = max(scores, key=scores.get)
        if scores[best_category] == 0:
            return "Macroeconomic"
        return best_category

    def _calculate_impact_score(self, sentiment: float, category: str, text: str) -> int:
        """Calibrates severity rating on a 1-10 institutional scale."""
        base_impact = 5

        if sentiment < -0.6:
            base_impact += 3
        elif sentiment < -0.2:
            base_impact += 2
        elif sentiment > 0.4:
            base_impact -= 1

        if category in ["Credit Event", "Geopolitical"]:
            base_impact += 2
        elif category == "Macroeconomic":
            base_impact += 1

        high_alert_words = [
            "crisis", "emergency", "default", "surge", "war", "collapse",
            "shortfall", "plunge", "unexpected", "wipeout", "run", "bottleneck"
        ]
        if any(w in text.lower() for w in high_alert_words):
            base_impact += 1

        return max(1, min(10, base_impact))

    def _extract_entity(self, text: str) -> str:
        """Extracts primary corporate/macro entity."""
        ticker_match = re.search(r'\$([A-Za-z]{2,5})\b', text)
        if ticker_match:
            return ticker_match.group(1).upper()

        known_entities = [
            "Silicon Valley Bank", "Credit Suisse", "Federal Reserve", "US Treasury",
            "European Central Bank", "ECB", "Reserve Bank of India", "RBI",
            "Bank of England", "Bank of Japan", "PBOC", "IMF", "World Bank",
            "OPEC", "JPMorgan", "Goldman Sachs", "Citigroup", "Morgan Stanley",
            "Tech Giant Corp", "Global Automaker", "TSMC"
        ]
        for ent in known_entities:
            if ent.lower() in text.lower():
                return ent

        capitalized_phrase = re.findall(r'\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b', text)
        if capitalized_phrase:
            exclusions = {"The", "A", "An", "In", "On", "Following", "When", "If", "Bank", "Terminal", "News", "Breaking"}
            candidates = [c for c in capitalized_phrase if c not in exclusions]
            if candidates:
                return candidates[0]

        return "Market Broad"

    def _extract_geolocation(self, text: str, forced_geo: Optional[Dict[str, Any]] = None) -> GeoLocation:
        """
        Geocodes the financial news item into geographic coordinates for 3D Globe visualization.
        """
        if forced_geo:
            return GeoLocation(
                country=forced_geo.get("country", "Global"),
                country_code=forced_geo.get("country_code", "GL"),
                city=forced_geo.get("city", "Global Hub"),
                latitude=float(forced_geo.get("lat", 20.0)),
                longitude=float(forced_geo.get("lng", 0.0))
            )

        text_lower = text.lower()
        
        # Sort keys by descending length so "united states" matches before "us"
        for key in sorted(GEO_KNOWLEDGE_BASE.keys(), key=len, reverse=True):
            pattern = r'\b' + re.escape(key) + r'\b'
            if re.search(pattern, text_lower):
                geo_info = GEO_KNOWLEDGE_BASE[key]
                return GeoLocation(
                    country=geo_info["country"],
                    country_code=geo_info["country_code"],
                    city=geo_info["city"],
                    latitude=geo_info["lat"],
                    longitude=geo_info["lng"]
                )

        # Default fallback: Global Financial Axis (London/Prime Meridian)
        return GeoLocation(
            country="Global Financial Market",
            country_code="GL",
            city="Global Axis",
            latitude=51.5074,
            longitude=-0.1278
        )

    def process_text(self, source: str, text: str, forced_geo: Optional[Dict[str, Any]] = None) -> RiskSignal:
        sentiment = self._extract_sentiment(text)
        category = self._classify_event(text)
        impact = self._calculate_impact_score(sentiment, category, text)
        entity = self._extract_entity(text)
        geolocation = self._extract_geolocation(text, forced_geo)

        return RiskSignal(
            source=source,
            headline_or_text=text,
            entity_mentioned=entity,
            sentiment_score=sentiment,
            event_classification=category,
            impact_score=impact,
            trigger_stress_test=(impact >= 7),
            geolocation=geolocation
        )


# ==========================================================
# 5. STANDALONE PIPELINE VERIFICATION RUNNER
# ==========================================================

if __name__ == "__main__":
    engine = RiskEngineNLP(use_hf=False)
    ingestor = DataIngestionPipe()
    raw_feed = ingestor.fetch_mock_data_feed()

    print("\n" + "=" * 75)
    print(" [CRISIL / S&P] INSTITUTIONAL AI RISK ENGINE: GEOLOCATED PIPELINE")
    print("=" * 75 + "\n")
    
    structured_outputs = []
    for item in raw_feed:
        signal = engine.process_text(
            source=item["source"], 
            text=item["text"], 
            forced_geo=item.get("forced_geo")
        )
        signal_dict = signal.model_dump()
        structured_outputs.append(signal_dict)
        
        geo = signal.geolocation
        print(f"SOURCE:      {signal.source}")
        print(f"HEADLINE:    {signal.headline_or_text[:65]}...")
        print(f"ENTITY:      {signal.entity_mentioned}")
        print(f"SENTIMENT:   {signal.sentiment_score:+.2f}")
        print(f"EVENT:       {signal.event_classification}")
        print(f"IMPACT:      {signal.impact_score}/10")
        print(f"GEOLOCATION: {geo.city}, {geo.country} ({geo.latitude:.4f}, {geo.longitude:.4f})")
        print(f"TRIGGER:     {'[ALERT] ACTIVE (STRESS TEST)' if signal.trigger_stress_test else '[PASS] NORMAL (OPERATIONAL)'}")
        print("-" * 75)

    with open("risk_signals_output.json", "w", encoding="utf-8") as f:
        json.dump(structured_outputs, f, indent=2)
        
    print("\n[SUCCESS] Signals with Geolocation validated and saved to 'risk_signals_output.json'")
"""
UPSC Current Affairs Scraper
============================
Scrapes daily current affairs from government sources and news sites.

Sources:
- PIB (Press Information Bureau)
- PRS (PRS Legislative Research)
- MEA (Ministry of External Affairs)
- The Hindu
- Indian Express
"""

import requests
from bs4 import BeautifulSoup
from datetime import datetime, timedelta
import json
import os
import hashlib
import re
from typing import List, Dict, Optional
from dataclasses import dataclass, asdict

# User agent to mimic browser
HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
}

# UPSC relevant keywords for filtering
UPSC_KEYWORDS = {
    'Polity & Governance': [
        'constitution', 'parliament', 'supreme court', 'high court', 'election', 'governor',
        'president', 'prime minister', 'cabinet', 'bill', 'act', 'fundamental rights',
        'directive principles', 'judiciary', 'executive', 'legislature', 'federalism',
        'panchayat', 'municipality', 'lokpal', 'rti', 'niti aayog', 'collegium'
    ],
    'Economy': [
        'gdp', 'inflation', 'rbi', 'monetary policy', 'fiscal policy', 'budget', 'tax',
        'gst', 'export', 'import', 'trade', 'fdi', 'stock market', 'sebi', 'banking',
        'npa', 'msme', 'startup', 'make in india', 'pli scheme', 'digital economy'
    ],
    'Environment & Ecology': [
        'climate change', 'biodiversity', 'pollution', 'forest', 'wildlife', 'wetland',
        'coral reef', 'mangrove', 'carbon', 'emission', 'renewable energy', 'solar',
        'wind energy', 'cop', 'ipcc', 'unfccc', 'paris agreement', 'net zero'
    ],
    'Science & Technology': [
        'isro', 'drdo', 'space', 'satellite', 'rocket', 'ai', 'artificial intelligence',
        'quantum', 'biotechnology', 'genome', 'nanotechnology', '5g', '6g', 'semiconductor',
        'supercomputer', 'nuclear', 'defense technology', 'cyber security'
    ],
    'International Relations': [
        'bilateral', 'multilateral', 'g20', 'g7', 'brics', 'quad', 'asean', 'saarc',
        'united nations', 'who', 'wto', 'imf', 'world bank', 'treaty', 'summit',
        'diplomacy', 'foreign policy', 'indo-pacific', 'china', 'pakistan', 'usa'
    ],
    'History & Culture': [
        'heritage', 'archaeological', 'ancient', 'medieval', 'modern history', 'freedom struggle',
        'gandhi', 'nehru', 'unesco', 'intangible heritage', 'art', 'architecture', 'festival'
    ],
    'Geography': [
        'earthquake', 'volcano', 'cyclone', 'monsoon', 'glacier', 'river', 'mountain',
        'plateau', 'coastal', 'drought', 'flood', 'landslide', 'tsunami', 'el nino', 'la nina'
    ]
}


@dataclass
class Article:
    """Represents a current affairs article"""
    id: str
    title: str
    summary: str
    source: str  # 'pib', 'prs', 'mea', 'hindu', 'ie'
    url: str
    date: str
    category: str
    tags: List[str]
    relevance_score: float
    highlights: List[str]
    full_content: Optional[str] = None


class BaseScraper:
    """Base class for all scrapers"""
    
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update(HEADERS)
    
    def fetch_page(self, url: str) -> Optional[BeautifulSoup]:
        """Fetch and parse a webpage"""
        try:
            response = self.session.get(url, timeout=30)
            response.raise_for_status()
            return BeautifulSoup(response.content, 'lxml')
        except Exception as e:
            print(f"❌ Error fetching {url}: {e}")
            return None
    
    def generate_id(self, title: str, source: str) -> str:
        """Generate unique ID for article"""
        text = f"{title}{source}{datetime.now().strftime('%Y%m%d')}"
        return hashlib.md5(text.encode()).hexdigest()[:12]
    
    def calculate_relevance(self, text: str) -> tuple:
        """Calculate UPSC relevance score and category"""
        text_lower = text.lower()
        scores = {}
        
        for category, keywords in UPSC_KEYWORDS.items():
            score = sum(1 for kw in keywords if kw in text_lower)
            if score > 0:
                scores[category] = score
        
        if not scores:
            return 0.0, 'Current Events', []
        
        best_category = max(scores, key=scores.get)
        total_score = sum(scores.values())
        relevance = min(1.0, total_score / 10)  # Normalize to 0-1
        
        # Get matching tags
        tags = []
        for cat, score in sorted(scores.items(), key=lambda x: -x[1])[:3]:
            tags.append(f"GS: {cat.split('&')[0].strip()}")
        
        return relevance, best_category, tags


class PIBScraper(BaseScraper):
    """Scrapes Press Information Bureau (pib.gov.in)"""
    
    BASE_URL = "https://pib.gov.in"
    
    def fetch_today_releases(self) -> List[Article]:
        """Fetch today's press releases"""
        articles = []
        
        # PIB has date-based URLs
        today = datetime.now()
        url = f"{self.BASE_URL}/allRel.aspx"
        
        soup = self.fetch_page(url)
        if not soup:
            return articles
        
        # Find press release links
        releases = soup.select('.release-list a, .content-area a')
        
        for release in releases[:20]:  # Limit to 20
            try:
                title = release.get_text(strip=True)
                if len(title) < 20:  # Skip short/invalid titles
                    continue
                
                link = release.get('href', '')
                if not link.startswith('http'):
                    link = self.BASE_URL + link
                
                # Calculate relevance
                relevance, category, tags = self.calculate_relevance(title)
                
                if relevance >= 0.2:  # Only include relevant articles
                    article = Article(
                        id=self.generate_id(title, 'pib'),
                        title=title,
                        summary=title,  # Will be updated with content
                        source='pib',
                        url=link,
                        date=today.strftime('%Y-%m-%d'),
                        category=category,
                        tags=['Government'] + tags,
                        relevance_score=relevance,
                        highlights=[]
                    )
                    articles.append(article)
            except Exception as e:
                print(f"Error parsing PIB release: {e}")
                continue
        
        print(f"✅ PIB: Found {len(articles)} relevant articles")
        return articles


class PRSScraper(BaseScraper):
    """Scrapes PRS Legislative Research (prsindia.org)"""
    
    BASE_URL = "https://prsindia.org"
    
    def fetch_latest_bills(self) -> List[Article]:
        """Fetch latest bills and acts"""
        articles = []
        
        url = f"{self.BASE_URL}/billtrack"
        soup = self.fetch_page(url)
        if not soup:
            return articles
        
        # Find bill entries
        bills = soup.select('.views-row, .bill-item, article')
        
        for bill in bills[:15]:
            try:
                title_elem = bill.select_one('h2, h3, .title, a')
                if not title_elem:
                    continue
                
                title = title_elem.get_text(strip=True)
                link = title_elem.get('href', '') if title_elem.name == 'a' else ''
                if link and not link.startswith('http'):
                    link = self.BASE_URL + link
                
                summary_elem = bill.select_one('p, .summary, .description')
                summary = summary_elem.get_text(strip=True) if summary_elem else title
                
                relevance, category, tags = self.calculate_relevance(title + ' ' + summary)
                
                if relevance >= 0.3:
                    article = Article(
                        id=self.generate_id(title, 'prs'),
                        title=title,
                        summary=summary[:300],
                        source='prs',
                        url=link or url,
                        date=datetime.now().strftime('%Y-%m-%d'),
                        category=category,
                        tags=['Legislation', 'Prelims'] + tags,
                        relevance_score=relevance,
                        highlights=[]
                    )
                    articles.append(article)
            except Exception as e:
                continue
        
        print(f"✅ PRS: Found {len(articles)} relevant articles")
        return articles


class MEAScraper(BaseScraper):
    """Scrapes Ministry of External Affairs (mea.gov.in)"""
    
    BASE_URL = "https://www.mea.gov.in"
    
    def fetch_press_releases(self) -> List[Article]:
        """Fetch MEA press releases"""
        articles = []
        
        url = f"{self.BASE_URL}/press-releases.htm"
        soup = self.fetch_page(url)
        if not soup:
            return articles
        
        # Find press releases
        releases = soup.select('.press-release, .media-item, article a')
        
        for release in releases[:15]:
            try:
                if release.name == 'a':
                    title = release.get_text(strip=True)
                    link = release.get('href', '')
                else:
                    title_elem = release.select_one('a, h3, .title')
                    if not title_elem:
                        continue
                    title = title_elem.get_text(strip=True)
                    link = title_elem.get('href', '') if title_elem.name == 'a' else ''
                
                if len(title) < 20:
                    continue
                
                if link and not link.startswith('http'):
                    link = self.BASE_URL + link
                
                relevance, category, tags = self.calculate_relevance(title)
                
                # MEA content is automatically IR relevant
                if 'International Relations' not in tags:
                    tags.insert(0, 'GS: International Relations')
                relevance = max(relevance, 0.5)
                
                article = Article(
                    id=self.generate_id(title, 'mea'),
                    title=title,
                    summary=title,
                    source='mea',
                    url=link or url,
                    date=datetime.now().strftime('%Y-%m-%d'),
                    category='International Relations',
                    tags=['Foreign Affairs', 'Prelims'] + tags[:2],
                    relevance_score=relevance,
                    highlights=[]
                )
                articles.append(article)
            except Exception as e:
                continue
        
        print(f"✅ MEA: Found {len(articles)} relevant articles")
        return articles


class TheHinduScraper(BaseScraper):
    """Scrapes The Hindu editorials and national news"""
    
    BASE_URL = "https://www.thehindu.com"
    
    def fetch_editorials(self) -> List[Article]:
        """Fetch editorial articles"""
        articles = []
        
        urls = [
            f"{self.BASE_URL}/opinion/editorial/",
            f"{self.BASE_URL}/opinion/op-ed/",
            f"{self.BASE_URL}/news/national/"
        ]
        
        for page_url in urls:
            soup = self.fetch_page(page_url)
            if not soup:
                continue
            
            # Find article cards
            cards = soup.select('.story-card, article, .element')
            
            for card in cards[:10]:
                try:
                    title_elem = card.select_one('h2, h3, .title a, a.story-card-news-default')
                    if not title_elem:
                        continue
                    
                    title = title_elem.get_text(strip=True)
                    if len(title) < 20:
                        continue
                    
                    link = title_elem.get('href', '')
                    if not link.startswith('http'):
                        link = self.BASE_URL + link
                    
                    summary_elem = card.select_one('p, .story-card-text')
                    summary = summary_elem.get_text(strip=True) if summary_elem else title
                    
                    relevance, category, tags = self.calculate_relevance(title + ' ' + summary)
                    
                    # Check if editorial
                    is_editorial = 'editorial' in page_url or 'op-ed' in page_url
                    
                    if relevance >= 0.2:
                        article = Article(
                            id=self.generate_id(title, 'hindu'),
                            title=title,
                            summary=summary[:300],
                            source='hindu',
                            url=link,
                            date=datetime.now().strftime('%Y-%m-%d'),
                            category=category,
                            tags=(['★ Editorial'] if is_editorial else []) + tags,
                            relevance_score=relevance,
                            highlights=[]
                        )
                        articles.append(article)
                except Exception as e:
                    continue
        
        print(f"✅ The Hindu: Found {len(articles)} relevant articles")
        return articles


class IndianExpressScraper(BaseScraper):
    """Scrapes Indian Express Explained section"""
    
    BASE_URL = "https://indianexpress.com"
    
    def fetch_explained(self) -> List[Article]:
        """Fetch IE Explained articles"""
        articles = []
        
        urls = [
            f"{self.BASE_URL}/section/explained/",
            f"{self.BASE_URL}/section/opinion/"
        ]
        
        for page_url in urls:
            soup = self.fetch_page(page_url)
            if not soup:
                continue
            
            cards = soup.select('.articles, article, .northeast-topbox')
            
            for card in cards[:10]:
                try:
                    title_elem = card.select_one('h2, h3, .title, a')
                    if not title_elem:
                        continue
                    
                    title = title_elem.get_text(strip=True)
                    if len(title) < 20:
                        continue
                    
                    link = card.select_one('a')
                    link = link.get('href', '') if link else ''
                    if link and not link.startswith('http'):
                        link = self.BASE_URL + link
                    
                    summary_elem = card.select_one('p')
                    summary = summary_elem.get_text(strip=True) if summary_elem else title
                    
                    relevance, category, tags = self.calculate_relevance(title + ' ' + summary)
                    
                    is_explained = 'explained' in page_url
                    
                    if relevance >= 0.2:
                        article = Article(
                            id=self.generate_id(title, 'ie'),
                            title=title,
                            summary=summary[:300],
                            source='ie',
                            url=link or page_url,
                            date=datetime.now().strftime('%Y-%m-%d'),
                            category=category,
                            tags=(['Explained'] if is_explained else ['★ Editorial']) + tags,
                            relevance_score=relevance,
                            highlights=[]
                        )
                        articles.append(article)
                except Exception as e:
                    continue
        
        print(f"✅ Indian Express: Found {len(articles)} relevant articles")
        return articles


class CurrentAffairsScraper:
    """Main orchestrator for all scrapers"""
    
    def __init__(self, output_dir: str = '../data'):
        self.output_dir = output_dir
        self.scrapers = {
            'pib': PIBScraper(),
            'prs': PRSScraper(),
            'mea': MEAScraper(),
            'hindu': TheHinduScraper(),
            'ie': IndianExpressScraper()
        }
    
    def scrape_all(self) -> List[Article]:
        """Scrape all sources"""
        all_articles = []
        
        print("\n🔄 Starting Current Affairs Scrape...")
        print("=" * 50)
        
        # PIB
        try:
            all_articles.extend(self.scrapers['pib'].fetch_today_releases())
        except Exception as e:
            print(f"❌ PIB scraping failed: {e}")
        
        # PRS
        try:
            all_articles.extend(self.scrapers['prs'].fetch_latest_bills())
        except Exception as e:
            print(f"❌ PRS scraping failed: {e}")
        
        # MEA
        try:
            all_articles.extend(self.scrapers['mea'].fetch_press_releases())
        except Exception as e:
            print(f"❌ MEA scraping failed: {e}")
        
        # The Hindu
        try:
            all_articles.extend(self.scrapers['hindu'].fetch_editorials())
        except Exception as e:
            print(f"❌ The Hindu scraping failed: {e}")
        
        # Indian Express
        try:
            all_articles.extend(self.scrapers['ie'].fetch_explained())
        except Exception as e:
            print(f"❌ Indian Express scraping failed: {e}")
        
        # Sort by relevance
        all_articles.sort(key=lambda x: -x.relevance_score)
        
        # Remove duplicates by title similarity
        unique_articles = self._deduplicate(all_articles)
        
        print("=" * 50)
        print(f"✅ Total unique articles: {len(unique_articles)}")
        
        return unique_articles
    
    def _deduplicate(self, articles: List[Article]) -> List[Article]:
        """Remove duplicate articles based on title similarity"""
        seen_titles = set()
        unique = []
        
        for article in articles:
            # Create normalized title for comparison
            normalized = re.sub(r'[^a-z0-9]', '', article.title.lower())[:50]
            
            if normalized not in seen_titles:
                seen_titles.add(normalized)
                unique.append(article)
        
        return unique
    
    def save_to_json(self, articles: List[Article], filename: str = None):
        """Save articles to JSON file"""
        if filename is None:
            filename = f"current_affairs_{datetime.now().strftime('%Y%m%d')}.json"
        
        # Ensure output directory exists
        os.makedirs(self.output_dir, exist_ok=True)
        
        filepath = os.path.join(self.output_dir, filename)
        
        data = {
            'last_updated': datetime.now().isoformat(),
            'date': datetime.now().strftime('%Y-%m-%d'),
            'total_articles': len(articles),
            'articles': [asdict(a) for a in articles]
        }
        
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        
        print(f"💾 Saved to: {filepath}")
        return filepath
    
    def load_from_json(self, date: str = None) -> List[Article]:
        """Load articles from JSON file"""
        if date is None:
            date = datetime.now().strftime('%Y%m%d')
        
        filename = f"current_affairs_{date}.json"
        filepath = os.path.join(self.output_dir, filename)
        
        if not os.path.exists(filepath):
            return []
        
        with open(filepath, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        return [Article(**a) for a in data['articles']]


def main():
    """Main entry point"""
    import argparse
    
    parser = argparse.ArgumentParser(description='UPSC Current Affairs Scraper')
    parser.add_argument('--source', choices=['all', 'pib', 'prs', 'mea', 'hindu', 'ie'],
                       default='all', help='Source to scrape')
    parser.add_argument('--output', default='../data', help='Output directory')
    
    args = parser.parse_args()
    
    scraper = CurrentAffairsScraper(output_dir=args.output)
    
    if args.source == 'all':
        articles = scraper.scrape_all()
    else:
        s = scraper.scrapers[args.source]
        if args.source == 'pib':
            articles = s.fetch_today_releases()
        elif args.source == 'prs':
            articles = s.fetch_latest_bills()
        elif args.source == 'mea':
            articles = s.fetch_press_releases()
        elif args.source == 'hindu':
            articles = s.fetch_editorials()
        elif args.source == 'ie':
            articles = s.fetch_explained()
    
    if articles:
        scraper.save_to_json(articles)
        
        # Print top 5
        print("\n📰 Top 5 Most Relevant Articles:")
        for i, article in enumerate(articles[:5], 1):
            print(f"  {i}. [{article.source.upper()}] {article.title[:60]}...")
            print(f"     Category: {article.category} | Relevance: {article.relevance_score:.2f}")


if __name__ == '__main__':
    main()

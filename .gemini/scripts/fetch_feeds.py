import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta, timezone
import email.utils
import json
import sys

FEEDS = {
    "🔴 PRIORITY 1: Google Workspace & Gemini": [
        "https://workspaceupdates.googleblog.com/feeds/posts/default",
        "https://www.google.com/appsstatus/dashboard/fb/rss",
        "https://developers.google.com/feeds/workspace-release-notes.xml",
        "https://blog.google/products/workspace/rss/",
        "https://cloud.google.com/feeds/vertex-ai-release-notes.xml",
        "https://deepmind.google/blog/rss.xml",
        "https://blog.google/technology/ai/rss/"
    ],
    "🔵 PRIORITY 2: GCP & Cloud Architecture": [
        "https://cloud.google.com/feeds/gcp-release-notes.xml",
        "https://cloud.google.com/feeds/kubernetes-engine-release-notes.xml",
        "https://cloud.google.com/blog/products/identity-security/rss",
        "https://www.mandiant.com/resources/blog/rss.xml"
    ],
    "🟢 PRIORITY 3: Executive AI Summary": [
        "https://openai.com/news/rss.xml",
        "https://www.bensbites.co/feed",
        "https://go.dev/blog/feed.atom"
    ]
}

def parse_date(date_str):
    try:
        # Handles RFC 2822 (RSS)
        parsed_tuple = email.utils.parsedate_tz(date_str)
        if parsed_tuple:
            timestamp = email.utils.mktime_tz(parsed_tuple)
            return datetime.fromtimestamp(timestamp, timezone.utc)
    except Exception:
        pass
    try:
        # Handles ISO 8601 (Atom)
        # simplified parsing for python < 3.11 datetime.fromisoformat
        date_str = date_str.replace('Z', '+00:00')
        return datetime.fromisoformat(date_str)
    except Exception:
        return datetime.now(timezone.utc) # fallback

def fetch_and_parse():
    cutoff = datetime.now(timezone.utc) - timedelta(days=2)
    results = {}

    for category, urls in FEEDS.items():
        results[category] = []
        for url in urls:
            try:
                req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
                with urllib.request.urlopen(req, timeout=10) as response:
                    content = response.read()
                    
                root = ET.fromstring(content)
                
                # Check if it's Atom or RSS
                if root.tag.endswith('feed'): # Atom
                    for entry in root.findall('.//{http://www.w3.org/2005/Atom}entry'):
                        title = entry.find('{http://www.w3.org/2005/Atom}title')
                        link = entry.find('{http://www.w3.org/2005/Atom}link')
                        pub = entry.find('{http://www.w3.org/2005/Atom}published') or entry.find('{http://www.w3.org/2005/Atom}updated')
                        desc = entry.find('{http://www.w3.org/2005/Atom}summary') or entry.find('{http://www.w3.org/2005/Atom}content')
                        
                        if title is not None and link is not None:
                            d = parse_date(pub.text) if pub is not None else datetime.now(timezone.utc)
                            if d >= cutoff:
                                href = link.attrib.get('href', '')
                                results[category].append({
                                    "source": url,
                                    "title": title.text.strip() if title.text else '',
                                    "url": href,
                                    "date": d.isoformat(),
                                    "summary": desc.text.strip()[:300] + '...' if desc is not None and desc.text else ''
                                })
                else: # RSS
                    for item in root.findall('.//item'):
                        title = item.find('title')
                        link = item.find('link')
                        pub = item.find('pubDate')
                        desc = item.find('description')
                        
                        if title is not None and link is not None:
                            d = parse_date(pub.text) if pub is not None and pub.text else datetime.now(timezone.utc)
                            if d >= cutoff:
                                results[category].append({
                                    "source": url,
                                    "title": title.text.strip() if title.text else '',
                                    "url": link.text.strip() if link.text else '',
                                    "date": d.isoformat(),
                                    "summary": desc.text.strip()[:300] + '...' if desc is not None and desc.text else ''
                                })
            except Exception as e:
                print(f"Error fetching {url}: {e}", file=sys.stderr)

    return results

if __name__ == "__main__":
    data = fetch_and_parse()
    
    with open('.gemini/data/latest_feeds.json', 'w') as f:
        json.dump(data, f, indent=2)
        
    # Generate a markdown summary for the LLM to read easily
    with open('.gemini/data/latest_feeds.md', 'w') as f:
        f.write("# Latest Strategic Intelligence Feeds (Past 48 Hours)\n\n")
        f.write("Use THESE EXACT URLs for your HTML report. DO NOT hallucinate the links.\n\n")
        
        for category, items in data.items():
            f.write(f"## {category}\n")
            if not items:
                f.write("*No updates in the past 48 hours.*\n\n")
            for item in items:
                f.write(f"### {item['title']}\n")
                f.write(f"**URL:** {item['url']}\n")
                f.write(f"**Source:** {item['source']}\n")
                f.write(f"**Date:** {item['date']}\n")
                f.write(f"**Summary:** {item['summary']}\n\n")
    
    print("Feeds successfully fetched and saved to .gemini/data/latest_feeds.md")


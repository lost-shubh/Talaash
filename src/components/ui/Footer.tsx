import Link from 'next/link';

export function Footer() {
  return (
    <footer>
      <div className="footer-inner">
        <div>
          <div className="footer-logo">TALAASH</div>
          <p className="footer-tag">
            Open-source missing persons registry for India.<br />
            Free. Community-run. Human-verified.<br /><br />
            If you have found someone, contact the family or call police immediately.<br /><br />
            <strong>Emergency: 100 | Child Helpline: 1094 | Women: 1091 | Senior: 14567</strong>
          </p>
        </div>
        <div className="footer-col">
          <h4>Platform</h4>
          <Link href="/">Browse Reports</Link>
          <Link href="/search">Search Database</Link>
          <Link href="/report">File a Report</Link>
          <Link href="/login">Login / Register</Link>
        </div>
        <div className="footer-col">
          <h4>Project</h4>
          <a href="https://github.com" target="_blank" rel="noopener noreferrer">GitHub — Open Source</a>
          <span>MIT License</span>
          <span>Privacy Policy</span>
          <span>Data Ethics Guidelines</span>
        </div>
      </div>
      <div className="footer-bot">
        <p>© {new Date().getFullYear()} Talaash Project. MIT License. Open source — contributions welcome.</p>
        <p>AI matching is for assistance only. Not for official or legal identification.</p>
      </div>
    </footer>
  );
}

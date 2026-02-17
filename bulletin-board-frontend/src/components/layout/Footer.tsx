import Link from "next/link";
import Image from "next/image";

export function Footer() {
  return (
    <footer className="hidden border-t border-border bg-card md:block">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2">
              <Image src="/images/logo.png" alt="GimmeDat" width={28} height={28} className="h-7 w-7 object-contain" />
              <span className="font-bold text-primary">GimmeDat</span>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Your campus marketplace for services, items, and community
              connections.
            </p>
          </div>

          {/* Platform */}
          <div>
            <h4 className="text-sm font-semibold text-foreground">Platform</h4>
            <ul className="mt-3 space-y-2">
              <FooterLink href="/feed">Browse Offers</FooterLink>
              <FooterLink href="/how-it-works">How It Works</FooterLink>
            </ul>
          </div>

          {/* Community */}
          <div>
            <h4 className="text-sm font-semibold text-foreground">Community</h4>
            <ul className="mt-3 space-y-2">
              <FooterLink href="/how-it-works#faq">FAQ</FooterLink>
              <FooterLink href="/how-it-works#safety">Safety</FooterLink>
              <FooterLink href="/contact">Contact Support</FooterLink>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-sm font-semibold text-foreground">Legal</h4>
            <ul className="mt-3 space-y-2">
              <FooterLink href="/terms">Terms of Service</FooterLink>
              <FooterLink href="/privacy">Privacy Policy</FooterLink>
            </ul>
          </div>
        </div>

        <div className="mt-8 border-t border-border pt-6 text-center text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} GimmeDat. A student community
          project.
        </div>
      </div>
    </footer>
  );
}

function FooterLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <li>
      <Link
        href={href}
        className="text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        {children}
      </Link>
    </li>
  );
}

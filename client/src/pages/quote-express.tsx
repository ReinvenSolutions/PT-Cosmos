import { ExpressQuoteGenerator } from "@/components/express-quote-generator";

export default function QuoteExpress() {
  return (
    <div className="flex flex-col flex-1 min-h-0 p-3 md:p-4 lg:p-5 bg-gradient-to-b from-accent/30 to-background">
      <ExpressQuoteGenerator />
    </div>
  );
}

import { Dashboard } from "@/components/dashboard";
import { MarketSentiment } from "@/components/market-sentiment";
import { Rocket } from "lucide-react";

export default function Home() {
  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6">
        <div className="flex items-center gap-2">
          <Rocket className="h-7 w-7 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">
            DogeRocket
          </h1>
        </div>
      </header>
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        <div className="grid gap-8 lg:grid-cols-7">
          <div className="lg:col-span-5">
             <Dashboard />
          </div>
          <div className="lg:col-span-2">
            <MarketSentiment />
          </div>
        </div>
      </main>
    </div>
  );
}

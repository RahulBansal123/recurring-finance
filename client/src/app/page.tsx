"use client";

import { useState } from "react";
import type { Account } from "viem";
import { Zap } from "lucide-react";

import { GenerateWallet } from "@/components/home/generate";
import { AddSessionKey } from "@/components/home/add-session-key";
import { Features } from "@/components/home/features";
import { DistributePayment } from "@/components/home/distribute-payment";

export default function Home() {
  const [account, setAccount] = useState<Account>();
  const [showDistributor, setShowDistributor] = useState(false);

  const renderScreen = () => {
    if (account) {
      if (showDistributor) {
        return <DistributePayment account={account} />;
      }

      return (
        <AddSessionKey
          account={account}
          onComplete={() => setShowDistributor(true)}
        />
      );
    }

    return <GenerateWallet setAccount={setAccount} />;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4 sm:p-8">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="p-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl">
              <Zap className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Recurring Finance
            </h1>
          </div>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto">
            Automate your crypto payments with smart wallet delegation and
            session keys
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          {renderScreen()}
        </div>

        <Features />
      </div>
    </div>
  );
}

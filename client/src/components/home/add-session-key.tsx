import { useEOA } from "@/hooks/useEOA";
import { Wallet, Calendar, DollarSign, Key, Shield, Check } from "lucide-react";
import { useState } from "react";
import type { Account } from "viem";
import { toast } from "sonner";
import { DISTRIBUTOR } from "@/config/constant";

interface PricePlan {
  id: string;
  name: string;
  dailyLimit: string;
  pullHourly: string;
  validityDays: number;
  price: string;
  features: string[];
  popular?: boolean;
}

const PRICE_PLANS: PricePlan[] = [
  {
    id: "basic",
    name: "Basic",
    dailyLimit: "24",
    pullHourly: "1",
    validityDays: 30,
    price: "720",
    features: [
      "$24 daily limit",
      "$1/hour pull",
      "30 days validity",
      "Basic support",
    ],
  },
  {
    id: "premium",
    name: "Premium",
    dailyLimit: "48",
    pullHourly: "2",
    validityDays: 60,
    price: "1440",
    features: [
      "$48 daily limit",
      "$2/hour pull",
      "60 days validity",
      "Priority support",
      "Advanced features",
    ],
    popular: true,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    dailyLimit: "72",
    pullHourly: "3",
    validityDays: 90,
    price: "2160",
    features: [
      "$72 daily limit",
      "$3/hour pull",
      "90 days validity",
      "24/7 support",
      "All features included",
    ],
  },
];

export const AddSessionKey = ({
  account,
  onComplete,
}: {
  account: Account;
  onComplete: () => void;
}) => {
  const [selectedPlan, setSelectedPlan] = useState<PricePlan | null>(null);
  const [loading, setLoading] = useState(false);

  const { isSmartEOA, signDelegation, schedulePayment } = useEOA({
    account,
  });

  const handleSignDelegation = async () => {
    if (!selectedPlan) {
      toast.error("Please select a plan first");
      return;
    }

    const validUntilTimestamp =
      Math.floor(Date.now() / 1000) + selectedPlan.validityDays * 24 * 60 * 60;

    try {
      setLoading(true);

      await Promise.all([
        signDelegation(
          DISTRIBUTOR,
          selectedPlan.dailyLimit,
          validUntilTimestamp,
        ),
        schedulePayment(selectedPlan.pullHourly, validUntilTimestamp),
      ]);

      toast.success("Recurring payment scheduled successfully");
      onComplete();
    } catch (error) {
      console.error(error);
      toast.error("Failed to add session key");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-6 border-b border-gray-100">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-green-100 rounded-lg">
            <Wallet className="w-5 h-5 text-green-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-800">
            Wallet Connected
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg p-4 border border-green-100">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-500">
                Wallet Address
              </span>
            </div>
            <p className="font-mono text-sm text-gray-800 break-all">
              {account.address}
            </p>
          </div>

          <div className="bg-white rounded-lg p-4 border border-green-100">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-500">
                Distributor Address
              </span>
            </div>
            <p className="font-mono text-sm text-gray-800 break-all">
              {DISTRIBUTOR}
            </p>
          </div>

          <div className="bg-white rounded-lg p-4 border border-green-100">
            <div className="flex items-center gap-2 mb-2">
              <Key className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-500">
                Smart EOA Status
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div
                className={`w-2 h-2 rounded-full ${isSmartEOA ? "bg-green-500" : "bg-red-500"}`}
              />
              <span className="text-sm font-medium">
                {isSmartEOA ? "Enabled" : "Disabled"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Price Plans */}
      <div className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-blue-100 rounded-lg">
            <DollarSign className="w-5 h-5 text-blue-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-800">
            Choose Your Plan
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {PRICE_PLANS.map((plan) => (
            <div
              key={plan.id}
              className={`relative bg-white rounded-xl border-2 p-6 cursor-pointer transition-all duration-200 hover:shadow-lg ${
                selectedPlan?.id === plan.id
                  ? "border-blue-500 shadow-lg ring-2 ring-blue-500 ring-opacity-20"
                  : "border-gray-200 hover:border-gray-300"
              } ${plan.popular ? "ring-2 ring-orange-500 ring-opacity-30" : ""}`}
              onClick={() => setSelectedPlan(plan)}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <span className="bg-orange-500 text-white px-3 py-1 rounded-full text-xs font-medium">
                    Most Popular
                  </span>
                </div>
              )}

              <div className="text-center mb-4">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">
                  {plan.name}
                </h3>
                <div className="flex items-center justify-center gap-1">
                  <DollarSign className="w-5 h-5 text-gray-500" />
                  <span className="text-3xl font-bold text-gray-900">
                    {plan.price}
                  </span>
                  <span className="text-gray-500">USDC</span>
                </div>
              </div>

              <div className="space-y-3">
                {plan.features.map((feature, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                    <span className="text-sm text-gray-600">{feature}</span>
                  </div>
                ))}
              </div>

              {selectedPlan?.id === plan.id && (
                <div className="absolute top-4 right-4">
                  <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Selected Plan Details */}
        {selectedPlan && (
          <div className="bg-blue-50 rounded-lg p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              Selected Plan: {selectedPlan.name}
            </h3>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="bg-white rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="w-4 h-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-500">
                    Daily Limit
                  </span>
                </div>
                <p className="text-lg font-semibold text-gray-800">
                  ${selectedPlan.dailyLimit} USDC
                </p>
              </div>

              <div className="bg-white rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="w-4 h-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-500">
                    Validity Period
                  </span>
                </div>
                <p className="text-lg font-semibold text-gray-800">
                  {selectedPlan.validityDays} days
                </p>
              </div>

              <div className="bg-white rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="w-4 h-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-500">
                    Total Cost
                  </span>
                </div>
                <p className="text-lg font-semibold text-gray-800">
                  ${selectedPlan.price} USDC
                </p>
              </div>
            </div>
          </div>
        )}
        {selectedPlan && (
          <span className="text-sm text-gray-500 mt-2">
            *This will allow the platform to pull ${selectedPlan.pullHourly}{" "}
            USDC from your wallet on hourly basis for{" "}
            {selectedPlan.validityDays} days
          </span>
        )}

        <button
          type="button"
          onClick={handleSignDelegation}
          disabled={loading || !selectedPlan}
          className={`w-full py-3 px-6 rounded-lg font-medium transition-all duration-200 ${
            loading || !selectedPlan
              ? "bg-gray-300 text-gray-500 cursor-not-allowed"
              : "bg-blue-600 text-white hover:bg-blue-700 hover:shadow-lg"
          }`}
        >
          {loading
            ? "Adding session key..."
            : selectedPlan
              ? `Add Session Key - ${selectedPlan.name} Plan`
              : "Select a plan to continue"}
        </button>
      </div>
    </>
  );
};

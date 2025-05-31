import { publicClient, relayerWalletClient } from "@/config/web3";
import { useEOA } from "@/hooks/useEOA";
import {
  Key,
  Shield,
  Wallet,
  Clock,
  CheckCircle,
  XCircle,
  ExternalLink,
  Activity,
} from "lucide-react";
import type { Account } from "viem";
import { DISTRIBUTOR } from "@/config/constant";

import DistributorABI from "@/abis/distributor.json";
import { toast } from "sonner";
import { useState, useEffect, useRef } from "react";
import { useReadContract } from "wagmi";

interface TransactionHistory {
  hash: string;
  timestamp: number;
  status: "pending" | "success" | "failed";
  blockNumber?: number;
}

export const DistributePayment = ({ account }: { account: Account }) => {
  const { isSmartEOA } = useEOA({
    account,
  });
  const { data: latestRecurringPaymentId } = useReadContract({
    address: DISTRIBUTOR,
    abi: DistributorABI,
    functionName: "recurringPaymentCounter",
  }) as { data: number };

  const [txHistory, setTxHistory] = useState<TransactionHistory[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [nextDistribution, setNextDistribution] = useState<Date | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  const handleDistribute = async (): Promise<void> => {
    const tempTx: TransactionHistory = {
      hash: "pending",
      timestamp: Date.now(),
      status: "pending",
    };

    setTxHistory((prev) => [tempTx, ...prev]);

    try {
      const usableRecurringPaymentId =
        BigInt(latestRecurringPaymentId) - BigInt(1);

      const maxPeriodToDistribute = 23; // as daily limit will exceed in case of more than a day's recurring payment

      const hash = await relayerWalletClient.writeContract({
        abi: DistributorABI,
        address: DISTRIBUTOR,
        functionName: "distribute",
        args: [usableRecurringPaymentId, BigInt(maxPeriodToDistribute)],
      });

      setTxHistory((prev) =>
        prev.map((tx) =>
          tx.hash === "pending" && tx.timestamp === tempTx.timestamp
            ? { ...tx, hash, status: "pending" as const }
            : tx,
        ),
      );

      console.log({ hash });

      const receipt = await publicClient.waitForTransactionReceipt({
        hash,
        confirmations: 2,
      });

      setTxHistory((prev) =>
        prev.map((tx) =>
          tx.hash === hash
            ? {
                ...tx,
                status: "success" as const,
                blockNumber: Number(receipt.blockNumber),
              }
            : tx,
        ),
      );

      toast.success("Distributed payment successfully");
    } catch (error) {
      console.error(error);

      setTxHistory((prev) =>
        prev.map((tx) =>
          tx.timestamp === tempTx.timestamp
            ? { ...tx, status: "failed" as const }
            : tx,
        ),
      );

      toast.error("Failed to distribute payment");
    }
  };

  const startAutoDistribution = () => {
    if (intervalRef.current) return;

    setIsRunning(true);
    setNextDistribution(new Date(Date.now() + 60 * 60 * 1000));

    handleDistribute();

    intervalRef.current = setInterval(
      () => {
        handleDistribute();
        setNextDistribution(new Date(Date.now() + 60 * 60 * 1000));
      },
      60 * 60 * 1000,
    );

    toast.success("Auto-distribution started");
  };

  const stopAutoDistribution = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
    setIsRunning(false);
    setNextDistribution(null);
    toast.info("Auto-distribution stopped");
  };

  const [timeUntilNext, setTimeUntilNext] = useState<string>("");

  useEffect(() => {
    if (!nextDistribution || !isRunning) {
      setTimeUntilNext("");
      return;
    }

    const updateCountdown = () => {
      const now = Date.now();
      const diff = nextDistribution.getTime() - now;

      if (diff <= 0) {
        setTimeUntilNext("Distributing...");
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeUntilNext(
        `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`,
      );
    };

    updateCountdown();
    countdownRef.current = setInterval(updateCountdown, 1000);

    return () => {
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
      }
    };
  }, [nextDistribution, isRunning]);

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
      }
    };
  }, []);

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const getStatusIcon = (status: TransactionHistory["status"]) => {
    switch (status) {
      case "pending":
        return <Activity className="w-4 h-4 text-yellow-500 animate-spin" />;
      case "success":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "failed":
        return <XCircle className="w-4 h-4 text-red-500" />;
    }
  };

  const getStatusColor = (status: TransactionHistory["status"]) => {
    switch (status) {
      case "pending":
        return "bg-yellow-50 border-yellow-200";
      case "success":
        return "bg-green-50 border-green-200";
      case "failed":
        return "bg-red-50 border-red-200";
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

      <div className="p-6">
        {/* Auto Distribution Control */}
        <div className="bg-blue-50 rounded-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Clock className="w-6 h-6 text-blue-600" />
              <h3 className="text-lg font-semibold text-gray-800">
                Auto Distribution
              </h3>
            </div>
            <div
              className={`px-3 py-1 rounded-full text-sm font-medium ${
                isRunning
                  ? "bg-green-100 text-green-800"
                  : "bg-gray-100 text-gray-800"
              }`}
            >
              {isRunning ? "Running" : "Stopped"}
            </div>
          </div>

          {isRunning && timeUntilNext && (
            <div className="mb-4 p-3 bg-white rounded-lg border">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Clock className="w-4 h-4" />
                <span>Next distribution in: </span>
                <span className="font-mono font-semibold text-blue-600">
                  {timeUntilNext}
                </span>
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={startAutoDistribution}
              disabled={isRunning}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                isRunning
                  ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                  : "bg-blue-600 text-white hover:bg-blue-700"
              }`}
            >
              Start Auto Distribution
            </button>
            <button
              type="button"
              onClick={stopAutoDistribution}
              disabled={!isRunning}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                !isRunning
                  ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                  : "bg-red-600 text-white hover:bg-red-700"
              }`}
            >
              Stop Auto Distribution
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg border">
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800">
              Transaction History
            </h3>
            <p className="text-sm text-gray-600">
              Recent distribution transactions
            </p>
          </div>

          <div className="divide-y divide-gray-200">
            {txHistory.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <Activity className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p>No distributions yet</p>
                <p className="text-sm">
                  Start auto-distribution to see transaction history
                </p>
              </div>
            ) : (
              txHistory.map((tx, index) => (
                <div
                  key={`${tx.hash}-${tx.timestamp}`}
                  className={`p-4 ${getStatusColor(tx.status)}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(tx.status)}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-800">
                            Distribution #{txHistory.length - index}
                          </span>
                          {tx.status === "success" && tx.blockNumber && (
                            <span className="text-xs text-gray-500">
                              Block #{tx.blockNumber}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">
                          {formatDate(tx.timestamp)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      {tx.hash !== "pending" && (
                        <div className="flex items-center gap-2">
                          <code className="text-xs bg-gray-100 px-2 py-1 rounded font-mono">
                            {tx.hash.slice(0, 8)}...{tx.hash.slice(-6)}
                          </code>
                          <a
                            href={`https://sepolia.etherscan.io/tx/${tx.hash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </>
  );
};

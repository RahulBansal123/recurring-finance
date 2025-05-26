import { publicClient, relayerWalletClient } from "@/config/web3";
import { useEOA } from "@/hooks/useEOA";
import { Key, Shield, Wallet } from "lucide-react";
import { parseUnits, type Account } from "viem";
import { DISTRIBUTOR_FACTORY, MOCK_USDC } from "@/config/constant";

import DistributorFactoryABI from "@/abis/distributorFactory.json";
import DistributorABI from "@/abis/distributor.json";
import { useReadContract } from "wagmi";
import { toast } from "sonner";
import { useState } from "react";

export const DistributePayment = ({ account }: { account: Account }) => {
	const { isSmartEOA } = useEOA({
		account,
	});

	const { data: distributors } = useReadContract({
		abi: DistributorFactoryABI,
		address: DISTRIBUTOR_FACTORY,
		functionName: "getOwnerDistributors",
		args: [account.address],
	});

	const [loading, setLoading] = useState(false);
	const [testLoading, setTestLoading] = useState(false);

	const handleTestPull = async () => {
		if (!distributors) return;
		const latestDistributor = distributors[distributors.length - 1];
		if (!latestDistributor) {
			toast.error("No distributor found");
			return;
		}

		setTestLoading(true);
		try {
			const hash = await relayerWalletClient.writeContract({
				abi: DistributorABI,
				address: latestDistributor,
				functionName: "test",
				args: [
					MOCK_USDC,
					"0x000000000000000000000000000000000000dEaD",
					parseUnits("0.1", 6),
				],
			});
			console.log({ hash });
			await publicClient.waitForTransactionReceipt({
				hash,
				confirmations: 2,
			});

			toast.success("Withdraw funds using session key successfully");
		} catch (error) {
			console.error(error);
		} finally {
			setTestLoading(false);
		}
	};

	const handleDistribute = async () => {
		if (!distributors) return;
		const latestDistributor = distributors[distributors.length - 1];
		if (!latestDistributor) {
			toast.error("No distributor found");
			return;
		}

		setLoading(true);
		try {
			const hash = await relayerWalletClient.writeContract({
				abi: DistributorABI,
				address: latestDistributor,
				functionName: "distribute",
				args: [BigInt(0), BigInt(0)],
			});
			console.log({ hash });
			await publicClient.waitForTransactionReceipt({
				hash,
				confirmations: 2,
			});

			toast.success("Distributed payment successfully");
		} catch (error) {
			console.error(error);
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

					{distributors?.length > 0 && (
						<div className="bg-white rounded-lg p-4 border border-green-100">
							<div className="flex items-center gap-2 mb-2">
								<Shield className="w-4 h-4 text-gray-500" />
								<span className="text-sm font-medium text-gray-500">
									Distributor Address
								</span>
							</div>
							<p className="font-mono text-sm text-gray-800 break-all">
								{distributors[distributors.length - 1]}
							</p>
						</div>
					)}

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

			<div className="p-8 text-center">
				<div className="max-w-md mx-auto">
					<div className="p-4 bg-blue-50 rounded-full w-20 h-20 mx-auto mb-6 flex items-center justify-center">
						<Wallet className="w-10 h-10 text-blue-600" />
					</div>

					<h2 className="text-2xl font-semibold text-gray-800 mb-4">
						Distribute Payment
					</h2>

					<p className="text-gray-600 mb-8">
						Distribute the recurring payment to all beneficiaries
					</p>

					<div className="flex items-center gap-3">
						<button
							type="button"
							onClick={handleTestPull}
							className="submit-btn"
							disabled={testLoading}
						>
							{testLoading ? "Pulling..." : "Test Pull Payment"}
						</button>
						<button
							type="button"
							onClick={handleDistribute}
							className="submit-btn"
							disabled={loading}
						>
							{loading ? "Distributing..." : "Distribute"}
						</button>
					</div>
				</div>
			</div>
		</>
	);
};

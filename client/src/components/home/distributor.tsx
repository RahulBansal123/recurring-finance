import { publicClient, walletClient } from "@/config/web3";
import type { Account } from "viem";
import DistributorFactoryABI from "@/abis/distributorFactory.json";
import { DISTRIBUTOR_FACTORY } from "@/config/constant";
import { toast } from "sonner";
import { Hammer, Key, Shield, Wallet } from "lucide-react";
import { useEOA } from "@/hooks/useEOA";
import { useState } from "react";

export const DistributorDeploy = ({
	account,
	onComplete,
}: {
	account: Account;
	onComplete: () => void;
}) => {
	const { isSmartEOA } = useEOA({
		account,
	});
	const [loading, setLoading] = useState(false);

	const handleDeploy = async () => {
		setLoading(true);
		try {
			const hash = await walletClient.writeContract({
				account,
				abi: DistributorFactoryABI,
				address: DISTRIBUTOR_FACTORY,
				functionName: "newDistributor",
				args: [account.address],
			});

			await publicClient.waitForTransactionReceipt({
				hash,
				confirmations: 2,
			});

			toast.success("Distributor deployed successfully");
			console.log(`Distributor deployed successfully: ${hash}`);
			onComplete();
		} catch (error) {
			console.error(error);
			toast.error("Distributor deployment failed");
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

				<div className="grid md:grid-cols-2 gap-4">
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
							<Key className="w-4 h-4 text-gray-500" />
							<span className="text-sm font-medium text-gray-500">
								Smart EOA Status
							</span>
							<span className="text-[0.7rem] text-gray-700">
								(Auto-Updated on Deploying Distributor)
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
			<div className="p-6 text-center">
				<div className="max-w-md mx-auto">
					<div className="p-4 bg-blue-50 rounded-full w-20 h-20 mx-auto mb-6 flex items-center justify-center">
						<Hammer className="w-10 h-10 text-blue-600" />
					</div>

					<h2 className="text-2xl font-semibold text-gray-800 mb-4">
						Deploy Distributor
					</h2>

					<p className="text-gray-600 mb-8">
						Deploy a new Distributor contract to manage recurring payments
					</p>

					<button
						type="button"
						disabled={loading}
						onClick={handleDeploy}
						className="submit-btn"
					>
						{loading ? "Deploying..." : "Create Distributor"}
					</button>
				</div>
			</div>
		</>
	);
};

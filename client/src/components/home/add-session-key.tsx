import { useEOA } from "@/hooks/useEOA";
import { Wallet, Calendar, DollarSign, Key, Shield } from "lucide-react";
import { useEffect, useState } from "react";
import type { Account } from "viem";
import { toast } from "sonner";
import { useReadContract } from "wagmi";
import DistributorFactoryABI from "@/abis/distributorFactory.json";
import { DISTRIBUTOR_FACTORY } from "@/config/constant";

export const AddSessionKey = ({
	account,
	onComplete,
}: {
	account: Account;
	onComplete: () => void;
}) => {
	const [distributorAddress, setDistributorAddress] = useState("");
	const [dailyLimit, setDailyLimit] = useState("");
	const [validUntil, setValidUntil] = useState("");

	const [loading, setLoading] = useState(false);

	const { isSmartEOA, signDelegation } = useEOA({
		account,
	});

	const { data: distributors } = useReadContract({
		abi: DistributorFactoryABI,
		address: DISTRIBUTOR_FACTORY,
		functionName: "getOwnerDistributors",
		args: [account.address],
	});

	useEffect(() => {
		if (!distributors) return;
		const latestDistributor = distributors?.[distributors.length - 1] || "";
		if (!latestDistributor) {
			return;
		}

		setDistributorAddress(latestDistributor);
	}, [distributors]);

	const handleSignDelegation = async () => {
		let validUntilTimestamp: number;
		if (validUntil) {
			validUntilTimestamp = Math.floor(new Date(validUntil).getTime() / 1000);
		} else {
			validUntilTimestamp = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30;
		}

		try {
			setLoading(true);
			const hash = await signDelegation(
				distributorAddress,
				dailyLimit || "100",
				validUntilTimestamp,
			);
			console.log(`Session key added successfully: ${hash}`);

			toast.success("Session key added successfully");
			onComplete();
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

					{distributorAddress?.length > 0 && (
						<div className="bg-white rounded-lg p-4 border border-green-100">
							<div className="flex items-center gap-2 mb-2">
								<Shield className="w-4 h-4 text-gray-500" />
								<span className="text-sm font-medium text-gray-500">
									Distributor Address
								</span>
							</div>
							<p className="font-mono text-sm text-gray-800 break-all">
								{distributorAddress}
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

			{/* Session Key Setup */}
			<div className="p-6">
				<div className="flex items-center gap-3 mb-6">
					<div className="p-2 bg-blue-100 rounded-lg">
						<Key className="w-5 h-5 text-blue-600" />
					</div>
					<h2 className="text-xl font-semibold text-gray-800">
						Add Session Key
					</h2>
				</div>

				<div className="space-y-6">
					<div>
						<label
							htmlFor="distributorAddress"
							className="block text-sm font-medium text-gray-700 mb-2"
						>
							Distributor Address
						</label>
						<div className="relative">
							<Shield className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
							<input
								id="distributorAddress"
								type="text"
								placeholder="0x12313..."
								value={distributorAddress}
								disabled
								className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 disabled:cursor-not-allowed disabled:bg-none disabled:!bg-gray-200 disabled:text-gray-900"
							/>
						</div>
					</div>

					<div className="grid md:grid-cols-2 gap-4">
						<div>
							<label
								htmlFor="dailyLimit"
								className="block text-sm font-medium text-gray-700 mb-2"
							>
								Daily Limit (USDC)
							</label>
							<div className="relative">
								<DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
								<input
									id="dailyLimit"
									type="number"
									placeholder="1000"
									value={dailyLimit}
									onChange={(e) => setDailyLimit(e.target.value)}
									className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
								/>
							</div>
						</div>

						<div>
							<label
								htmlFor="validUntil"
								className="block text-sm font-medium text-gray-700 mb-2"
							>
								Valid Until
							</label>
							<div className="relative">
								<Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
								<input
									id="validUntil"
									type="date"
									value={validUntil}
									onChange={(e) => setValidUntil(e.target.value)}
									className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
								/>
							</div>
						</div>
					</div>

					<button
						type="button"
						onClick={handleSignDelegation}
						disabled={loading}
						className="submit-btn"
					>
						{loading ? "Adding session key..." : "Add Session Key"}
					</button>
				</div>
			</div>
		</>
	);
};

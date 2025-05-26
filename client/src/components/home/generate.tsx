import { MOCK_USDC } from "@/config/constant";
import { publicClient, relayerWalletClient } from "@/config/web3";
import { Wallet } from "lucide-react";
import { useState } from "react";
import { erc20Abi, type Hex, parseEther, parseUnits, type Account } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";

export const GenerateWallet = ({
	setAccount,
}: {
	setAccount: React.Dispatch<React.SetStateAction<Account | undefined>>;
}) => {
	const [loading, setLoading] = useState(false);

	const handleGenerateWallet = async () => {
		const pKey = generatePrivateKey();
		console.log({ pKey });
		const account = privateKeyToAccount(pKey);

		setLoading(true);
		try {
			const ethHash = await relayerWalletClient.sendTransaction({
				to: account.address,
				value: parseEther("0.0002"),
			});

			const mockUSDCHash = await relayerWalletClient.writeContract({
				address: MOCK_USDC,
				abi: erc20Abi,
				functionName: "transfer",
				args: [account.address as Hex, parseUnits("100", 6)],
			});

			console.log({ ethHash, mockUSDCHash });

			await publicClient.waitForTransactionReceipt({
				hash: ethHash,
			});

			await publicClient.waitForTransactionReceipt({
				hash: mockUSDCHash,
			});

			setAccount(account);
		} catch (error) {
			console.error(error);
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="p-8 text-center">
			<div className="max-w-md mx-auto">
				<div className="p-4 bg-blue-50 rounded-full w-20 h-20 mx-auto mb-6 flex items-center justify-center">
					<Wallet className="w-10 h-10 text-blue-600" />
				</div>

				<h2 className="text-2xl font-semibold text-gray-800 mb-4">
					Get Started
				</h2>

				<p className="text-gray-600 mb-8">
					Generate a smart wallet to begin setting up recurring payments and
					session keys
				</p>

				<button
					type="button"
					onClick={handleGenerateWallet}
					className="submit-btn"
					disabled={loading}
				>
					{loading ? "Generating..." : "Generate Wallet"}
				</button>

				<div className="mt-2 bg-amber-50 border border-amber-200 rounded-lg p-4">
					<div className="flex items-start gap-2">
						<div className="w-4 h-4 bg-amber-400 rounded-full mt-0.5 flex-shrink-0" />
						<p className="text-sm text-amber-800">
							This will mint 100 MOCK USDC and some ETH for gas fees to help you
							get started
						</p>
					</div>
				</div>
			</div>
		</div>
	);
};

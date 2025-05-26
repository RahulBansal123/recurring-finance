import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { createPublicClient, createWalletClient, type Hex, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";

declare module "wagmi" {
	interface Register {
		config: typeof rainbowConfig;
	}
}

export const rainbowConfig = getDefaultConfig({
	appName: "Recurring Finance",
	projectId: "0f796c460abba91f32212775eb466ffc",
	chains: [sepolia],
	ssr: true,
});

export const publicClient = createPublicClient({
	chain: sepolia,
	transport: http(
		"https://eth-sepolia.g.alchemy.com/v2/IDA0tcmzh8rpi_ZYLoGd2zIP_CE6o6Yf",
	),
});

export const walletClient = createWalletClient({
	chain: sepolia,
	transport: http(
		"https://eth-sepolia.g.alchemy.com/v2/IDA0tcmzh8rpi_ZYLoGd2zIP_CE6o6Yf",
	),
});

export const relayer = privateKeyToAccount(
	process.env.NEXT_PUBLIC_PRIVATE_KEY as Hex,
);

export const relayerWalletClient = createWalletClient({
	account: relayer,
	chain: sepolia,
	transport: http(
		"https://eth-sepolia.g.alchemy.com/v2/IDA0tcmzh8rpi_ZYLoGd2zIP_CE6o6Yf",
	),
});

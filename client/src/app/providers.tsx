"use client";

import { rainbowConfig } from "@/config/web3";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { Toaster } from "sonner";
import { cookieToInitialState, WagmiProvider } from "wagmi";

import "@rainbow-me/rainbowkit/styles.css";
import { RainbowKitProvider } from "@rainbow-me/rainbowkit";

export const Providers = ({
	children,
	cookies,
}: { children: React.ReactNode; cookies: string | null }) => {
	const [queryClient] = useState(() => new QueryClient());
	const initialState = cookieToInitialState(rainbowConfig, cookies);

	return (
		<WagmiProvider config={rainbowConfig} initialState={initialState}>
			<QueryClientProvider client={queryClient}>
				<RainbowKitProvider>{children}</RainbowKitProvider>
				<Toaster />
			</QueryClientProvider>
		</WagmiProvider>
	);
};

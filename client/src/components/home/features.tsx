import { Key, Shield, Zap } from "lucide-react";

export const Features = () => (
	<div className="mt-12 grid md:grid-cols-3 gap-6">
		<div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
			<div className="p-2 bg-blue-50 rounded-lg w-fit mb-4">
				<Shield className="w-6 h-6 text-blue-600" />
			</div>
			<h3 className="font-semibold text-gray-800 mb-2">Secure Delegation</h3>
			<p className="text-gray-600 text-sm">
				Set spending limits and time boundaries for automated payments
			</p>
		</div>

		<div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
			<div className="p-2 bg-green-50 rounded-lg w-fit mb-4">
				<Zap className="w-6 h-6 text-green-600" />
			</div>
			<h3 className="font-semibold text-gray-800 mb-2">Smart Automation</h3>
			<p className="text-gray-600 text-sm">
				Automate recurring payments without compromising security
			</p>
		</div>

		<div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
			<div className="p-2 bg-purple-50 rounded-lg w-fit mb-4">
				<Key className="w-6 h-6 text-purple-600" />
			</div>
			<h3 className="font-semibold text-gray-800 mb-2">Session Keys</h3>
			<p className="text-gray-600 text-sm">
				Manage temporary access keys for specific use cases
			</p>
		</div>
	</div>
);

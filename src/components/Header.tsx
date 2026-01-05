"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function Header() {
	const pathname = usePathname();

	const isActive = (path: string) => {
		if (path === "/" && pathname === "/") return true;
		if (path !== "/" && pathname.startsWith(path)) return true;
		return false;
	};

	return (
		<header className="bg-white border-b border-gray-200 sticky top-0 z-50">
			<div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
				<div className="flex justify-between h-16">
					<div className="flex">
						<div className="flex-shrink-0 flex items-center">
							<Link href="/" className="text-xl font-bold text-gray-900">
								LLM Agora
							</Link>
						</div>
						<div className="hidden sm:ml-6 sm:flex sm:space-x-8">
							<Link
								href="/"
								className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
									isActive("/")
										? "border-blue-500 text-gray-900"
										: "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
								}`}
							>
								新しい議論
							</Link>
							<Link
								href="/logs"
								className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
									isActive("/logs")
										? "border-blue-500 text-gray-900"
										: "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
								}`}
							>
								履歴一覧
							</Link>
						</div>
					</div>
				</div>
			</div>
		</header>
	);
}

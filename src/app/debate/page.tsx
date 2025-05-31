"use client";

import Message, { type ChatMessageProps } from "./Message";
import TextArea from "./Textarea";

function DebatePage() {
  const chatMessages: ChatMessageProps[] = [
    {
      id: "20240607120001",
      message: "こんにちは、今日はAIの役割について肯定的な立場から議論します。",
      role: "llm",
      name: "肯定派AI（積極的）"
    },
    {
      id: "20240607120002",
      message: "AIと人間の役割について話したいです。",
      role: "user",
      name: "明石太郎"
    },
    {
      id: "20240607120003",
      message: "AIは社会に多くの利益をもたらすと考えます。例えば効率化や新しい価値の創出です。",
      role: "llm",
      name: "肯定派AI（積極的）"
    },
    {
      id: "20240607120004",
      message: "私はAIのリスクや課題についても知りたいです。私はAIのリスクや課題についても知りたいです。私はAIのリスクや課題についても知りたいです。私はAIのリスクや課題についても知りたいです。どうしても知りたいんです。",
      role: "user",
      name: "明石太郎"
    },
    {
      id: "20240607120005",
      message: "AIの導入には慎重な姿勢が必要です。倫理的な問題や人間の役割の喪失も考慮すべきです。",
      role: "llm",
      name: "否定派AI（慎重）"
    },
    {
      id: "20240607120006",
      message: "なるほど、両方の立場から意見を聞けて参考になります。",
      role: "user",
      name: "明石太郎"
    }
  ];

	return (
		<div>
			<header className="px-5 py-4 flex items-center justify-center border-b">
        <p className="text-2xl">Debate Page</p>
      </header>
      <main className="p-4">
        <section className="flex flex-col gap-4">
          {chatMessages.map((msg) => (
            <Message
              key={msg.id}
              id={msg.id}
              message={msg.message}
              role={msg.role}
              name={msg.name}
            />
          ))}
        </section>
        <section className="fixed w-full bottom-0 left-0 bg-white px-4 py-5 border-t">
          <TextArea />
        </section>
      </main>
		</div>
	);
}

export default DebatePage;

"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const faqs = [
  {
    question: "What is letmeflex.ai?",
    answer:
      "letmeflex.ai is an AI-powered platform that generates hyper-realistic luxury lifestyle images. Choose from categories like supercars, watches, mansions, yachts, and more to create stunning content for your social media.",
  },
  {
    question: "How realistic are the images?",
    answer:
      "Our AI models produce photorealistic results that are virtually indistinguishable from real photos. We use state-of-the-art image generation technology and fine-tuned prompts optimized for luxury content.",
  },
  {
    question: "What is face swap?",
    answer:
      "Face swap lets you place your own face into the generated images. Upload a selfie and our AI will seamlessly blend your face into the scene so it looks like you're actually there — behind the wheel, on the yacht, or in the penthouse.",
  },
  {
    question: "How do credits work?",
    answer:
      "Each image generation costs 1 credit. Free accounts get 3 credits to try the platform. Paid plans include monthly credits that renew each billing cycle. You can also purchase additional credit packs at any time.",
  },
  {
    question: "Can I get a refund?",
    answer:
      "We offer a 7-day money-back guarantee on all subscription plans. If you're not satisfied, contact our support team within 7 days of purchase for a full refund. Credit packs are non-refundable once credits have been used.",
  },
  {
    question: "Is this legal?",
    answer:
      "Yes. The images are AI-generated original content. You own full rights to the images you create and can use them for personal or commercial purposes. We do not use real photographs of real people or properties without consent.",
  },
  {
    question: "What formats are available?",
    answer:
      "Images are generated in high-resolution PNG format. Pro and Unlimited plans unlock HD and 4K resolution options. All images are optimized for social media platforms including Instagram, TikTok, and Snapchat.",
  },
  {
    question: "How fast is generation?",
    answer:
      "Most images are generated in 10-30 seconds depending on the complexity and selected model. Pro and Unlimited subscribers get priority queue access for faster processing during peak hours.",
  },
];

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggle = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section id="faq" className="w-full bg-surface px-4 py-24 md:py-32">
      <div className="mx-auto max-w-3xl">
        {/* Section heading */}
        <div className="mb-16 text-center">
          <h2 className="font-heading text-display-2 text-text-primary">
            Frequently asked questions
          </h2>
          <p className="mt-4 font-body text-text-muted">
            Everything you need to know about letmeflex.ai.
          </p>
        </div>

        {/* Accordion */}
        <div className="flex flex-col divide-y divide-border">
          {faqs.map((faq, index) => {
            const isOpen = openIndex === index;

            return (
              <div key={index}>
                <button
                  onClick={() => toggle(index)}
                  className="flex w-full items-center justify-between py-5 text-left transition-colors hover:text-gold"
                  aria-expanded={isOpen}
                >
                  <span className="pr-4 font-heading text-base font-semibold text-text-primary">
                    {faq.question}
                  </span>
                  <ChevronDown
                    className={cn(
                      "h-5 w-5 flex-shrink-0 text-text-subtle transition-transform duration-300",
                      isOpen && "rotate-180 text-gold"
                    )}
                  />
                </button>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: "easeInOut" as const }}
                      className="overflow-hidden"
                    >
                      <p className="pb-5 font-body text-sm leading-relaxed text-text-muted">
                        {faq.answer}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

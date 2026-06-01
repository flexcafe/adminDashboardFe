import { AnimatePresence, motion } from "framer-motion";
import { type ReactNode } from "react";

type FadeSlideSwapProps = {
  swapKey: string;
  children: ReactNode;
};

export function FadeSlideSwap({ swapKey, children }: FadeSlideSwapProps) {
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={swapKey}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        transition={{ duration: 0.22, ease: "easeOut" }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

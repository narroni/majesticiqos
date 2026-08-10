"use client";

import { Children, isValidElement, type ReactNode } from "react";

import { Reveal } from "@/components/motion/reveal";

const STEP_MS = 60;

interface StaggerProps {
  children: ReactNode;
  className?: string;
}

export function Stagger({ children, className }: StaggerProps) {
  const items = Children.toArray(children);

  return (
    <div className={className}>
      {items.map((child, index) => (
        <Reveal
          key={isValidElement(child) && child.key !== null ? child.key : index}
          delay={index * STEP_MS}
        >
          {child}
        </Reveal>
      ))}
    </div>
  );
}

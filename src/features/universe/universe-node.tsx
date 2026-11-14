import type { CSSProperties, ReactNode } from "react";
import { Button } from "@/components/ui/button";

type NodeProps = {
  position: { x: number; y: number };
  floatDelay: number;
  className: string;
  buttonClassName: string;
  label: string;
  onClick: () => void;
  icon: ReactNode;
  children: ReactNode;
};

type NodeStyle = CSSProperties & {
  "--node-x": string;
  "--node-y": string;
  "--float-delay": string;
};

export function UniverseNode({
  position,
  floatDelay,
  className,
  buttonClassName,
  label,
  onClick,
  icon,
  children,
}: NodeProps) {
  const style: NodeStyle = {
    "--node-x": `${position.x}%`,
    "--node-y": `${position.y}%`,
    "--float-delay": `${floatDelay}s`,
  };

  return (
    <div className={`positioned-node ${className}`} style={style}>
      <Button variant="node" className={buttonClassName} aria-label={label} onClick={onClick}>
        {icon}
      </Button>
      {children}
    </div>
  );
}

"use client"

import type { CSSProperties } from "react"
import {
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  MarkerType,
  Position,
  ReactFlow,
  type Edge,
  type Node,
  type NodeProps,
} from "@xyflow/react"
import "@xyflow/react/dist/style.css"
import "./HowItWorksFlow.css"

type HandleSpec = {
  id: string
  kind: "source" | "target"
  position: Position
  style?: CSSProperties
}

type ActorData = {
  label: string
  sublabel: string
  variant: "actor" | "chain"
  handles: HandleSpec[]
}

// Both handles of a lane sit at the same point (a source and a target
// stacked on top of each other) — invisible anchors, not something a
// visitor is meant to drag a new connection from. Two lanes per facing
// side keep the two round trips (unpaid request / 402, then signed
// payment / receipt) as parallel tracks instead of one edge overdrawing
// the other.
function lanePair(prefix: string, position: Position, top: string): HandleSpec[] {
  return [
    { id: `${prefix}-source`, kind: "source", position, style: { top } },
    { id: `${prefix}-target`, kind: "target", position, style: { top } },
  ]
}

const nodes: Node<ActorData>[] = [
  {
    id: "wasit",
    type: "actor",
    position: { x: 0, y: 20 },
    data: {
      label: "WASIT",
      sublabel: "the checker",
      variant: "actor",
      handles: [
        ...lanePair("lane-a", Position.Right, "38%"),
        ...lanePair("lane-b", Position.Right, "68%"),
        { id: "down-source", kind: "source", position: Position.Bottom },
      ],
    },
  },
  {
    id: "service",
    type: "actor",
    position: { x: 460, y: 20 },
    data: {
      label: "YOUR SERVICE",
      sublabel: "the target",
      variant: "actor",
      handles: [...lanePair("lane-a", Position.Left, "38%"), ...lanePair("lane-b", Position.Left, "68%")],
    },
  },
  {
    id: "stellar",
    type: "actor",
    position: { x: 150, y: 260 },
    data: {
      label: "STELLAR",
      sublabel: "the source of truth",
      variant: "chain",
      handles: [{ id: "top-target", kind: "target", position: Position.Top }],
    },
  },
]

const edges: Edge[] = [
  {
    id: "e1",
    source: "wasit",
    sourceHandle: "lane-a-source",
    target: "service",
    targetHandle: "lane-a-target",
    label: "① unpaid request",
    animated: true,
    markerEnd: { type: MarkerType.ArrowClosed },
  },
  {
    id: "e2",
    source: "service",
    sourceHandle: "lane-a-source",
    target: "wasit",
    targetHandle: "lane-a-target",
    label: "② 402 challenge",
    animated: true,
    markerEnd: { type: MarkerType.ArrowClosed },
  },
  {
    id: "e3",
    source: "wasit",
    sourceHandle: "lane-b-source",
    target: "service",
    targetHandle: "lane-b-target",
    label: "③ signed payment",
    animated: true,
    markerEnd: { type: MarkerType.ArrowClosed },
  },
  {
    id: "e4",
    source: "service",
    sourceHandle: "lane-b-source",
    target: "wasit",
    targetHandle: "lane-b-target",
    label: "④ 2xx receipt",
    animated: true,
    markerEnd: { type: MarkerType.ArrowClosed },
  },
  {
    id: "e5",
    source: "wasit",
    sourceHandle: "down-source",
    target: "stellar",
    targetHandle: "top-target",
    label: "⑤ verify transfer event",
    animated: true,
    className: "flow-edge-accent",
    markerEnd: { type: MarkerType.ArrowClosed, color: "var(--accent)" },
  },
]

function ActorNode({ data }: NodeProps<Node<ActorData>>) {
  return (
    <div className={`flow-actor${data.variant === "chain" ? " flow-actor--chain" : ""}`}>
      {data.handles.map((h) => (
        <Handle key={h.id} id={h.id} type={h.kind} position={h.position} style={h.style} />
      ))}
      <span className="flow-actor-label mono">{data.label}</span>
      <span className="flow-actor-sub">{data.sublabel}</span>
    </div>
  )
}

const nodeTypes = { actor: ActorNode }

/**
 * The request/response cycle from the "How it works" section, as an
 * actual sequence diagram instead of a numbered list — Wasit and Your
 * Service trade the HTTP round trip (steps ①–④), then Wasit breaks out
 * of that exchange entirely to check Stellar directly (⑤, the accent
 * edge). That last edge going somewhere neither of the other two nodes
 * touch is the whole point of the section: a receipt only proves your
 * service CLAIMS to have been paid, the chain proves it actually
 * happened.
 *
 * Nodes are draggable and the canvas pans/pinch-zooms (zoomOnScroll is
 * off on purpose — a marketing page shouldn't hijack the mouse wheel
 * from normal page scrolling), but new connections can't be drawn; this
 * is a diagram to explore, not an editor.
 */
export function HowItWorksFlow() {
  return (
    <div className="flow-canvas" role="img" aria-label="Sequence diagram: Wasit and your service exchange an HTTP payment challenge and payment, then Wasit independently verifies the transfer on Stellar rather than trusting your service's receipt.">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.15 }}
        proOptions={{ hideAttribution: false }}
        nodesConnectable={false}
        elementsSelectable={false}
        zoomOnScroll={false}
        zoomOnDoubleClick={false}
        minZoom={0.6}
        maxZoom={1.4}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#2a2a2a" />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  )
}

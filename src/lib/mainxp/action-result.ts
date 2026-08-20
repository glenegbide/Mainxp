// Shared result shape for rewarded actions. Lives OUTSIDE any "use server"
// module so client components can import the type without dragging server
// code into the client bundle (which silently breaks hydration).
export interface ActionReward {
  ok: boolean;
  /** MAINXP granted by this action (0 when it grants nothing). */
  xp?: number;
  error?: string;
}

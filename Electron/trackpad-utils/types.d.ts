declare module "wljs-trackpad-utils" {
	export type HapticPattern = "alignment" | "generic" | "levelChange";
	export function onTrackpadScrollBegan(callback: () => void): void;
	export function onTrackpadScrollEnded(callback: () => void): void;
	export function onForceClick(callback: () => void): void;
	export function triggerFeedback(pattern?: HapticPattern): void;
}

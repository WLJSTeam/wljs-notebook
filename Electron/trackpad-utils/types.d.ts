declare module "wljs-trackpad-utils" {
	export type HapticPattern = 0 | 1 | 2;
	export function onTrackpadScrollBegan(callback: () => void): void;
	export function onTrackpadScrollEnded(callback: () => void): void;
	export function onForceClick(callback: () => void): void;
	export function triggerFeedback(pattern?: HapticPattern): void;
}

import type { ComponentProps } from "react";

/**
 * Shared mock for next/image. Renders a plain <img> with only the props that are
 * safe for the DOM (omits priority/fetchPriority to avoid React warnings).
 */
export default function MockNextImage({
	alt,
	src,
	width,
	height,
	className,
}: ComponentProps<"img"> & { alt: string }) {
	return (
		// eslint-disable-next-line @next/next/no-img-element -- This is a test mock, using <img> is intentional
		<img alt={alt} src={src} width={width} height={height} className={className} />
	);
}

<script lang="ts">
  import { onMount } from "svelte";

  export type GallerySource = {
    type: string;
    srcset: string;
    sizes: string;
  };

  export type GalleryImage = {
    fileName: string;
    alt: string;
    sources: GallerySource[];
    fallback: {
      src: string;
      srcset: string;
      sizes: string;
      width: number;
      height: number;
    };
  };

  export let images: GalleryImage[] = [];

  let currentIndex = 0;
  let mounted = false;
  const urlParamKey = "photo";
  const preloadCount = 3;
  const preloaded = new Set<string>();
  const swipeThreshold = 60;
  const tapThreshold = 8;
  let dragStartX = 0;
  let dragStartY = 0;
  let dragDeltaX = 0;
  let isDragging = false;
  let pointerId: number | null = null;
  let frameWidth = 0;

  const clampIndex = (index: number) => {
    if (images.length === 0) return 0;
    return (index + images.length) % images.length;
  };

  const goNext = () => {
    currentIndex = clampIndex(currentIndex + 1);
  };

  const goPrev = () => {
    currentIndex = clampIndex(currentIndex - 1);
  };

  const syncFromUrl = () => {
    if (images.length === 0 || typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const fileName = params.get(urlParamKey);
    if (!fileName) return;
    const index = images.findIndex((image) => image.fileName === fileName);
    if (index >= 0) currentIndex = index;
  };

  const updateUrl = (index: number) => {
    if (images.length === 0 || typeof window === "undefined") return;
    const url = new URL(window.location.href);
    url.searchParams.set(urlParamKey, images[index].fileName);
    window.history.replaceState({}, "", url);
  };

  const preloadImage = (image: GalleryImage) => {
    if (preloaded.has(image.fileName)) return;
    // The visible <picture> renders the webp <source>, so warm the webp
    // srcset — preloading the jpeg fallback would fetch bytes never shown.
    const webp = image.sources.find((s) => s.type === "image/webp");
    const img = new Image();
    if (webp) {
      img.sizes = webp.sizes;
      img.srcset = webp.srcset;
    } else {
      img.sizes = image.fallback.sizes;
      img.srcset = image.fallback.srcset;
      img.src = image.fallback.src;
    }
    preloaded.add(image.fileName);
  };

  const preloadNext = (count: number) => {
    if (images.length === 0 || typeof window === "undefined") return;
    const max = Math.min(count, images.length - 1);
    for (let offset = 1; offset <= max; offset += 1) {
      preloadImage(images[clampIndex(currentIndex + offset)]);
    }
    if (images.length > 2) {
      preloadImage(images[clampIndex(currentIndex - 1)]);
    }
  };

  $: if (mounted && images.length > 0) {
    updateUrl(currentIndex);
    preloadNext(preloadCount);
  }

  const onKeydown = (event: KeyboardEvent) => {
    if (event.key === "ArrowRight") {
      goNext();
    }
    if (event.key === "ArrowLeft") {
      goPrev();
    }
  };

  const onPointerDown = (event: PointerEvent) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    pointerId = event.pointerId;
    const target = event.currentTarget;
    if (target instanceof HTMLElement) {
      frameWidth = target.clientWidth;
      try {
        target.setPointerCapture(event.pointerId);
      } catch {
        // capture is best-effort; drag still works without it
      }
    }
    dragStartX = event.clientX;
    dragStartY = event.clientY;
    dragDeltaX = 0;
    isDragging = true;
  };

  const onPointerMove = (event: PointerEvent) => {
    if (!isDragging || pointerId !== event.pointerId) return;
    const deltaX = event.clientX - dragStartX;
    const deltaY = event.clientY - dragStartY;
    if (Math.abs(deltaY) > Math.abs(deltaX)) return;
    dragDeltaX = deltaX;
  };

  // The browser fires pointercancel when it claims the gesture (e.g. a
  // vertical pan-y scroll). Routing it through onPointerUp used to register
  // small deltas as taps and flip the image mid-scroll — just reset instead.
  const onPointerCancel = (event: PointerEvent) => {
    if (pointerId !== event.pointerId) return;
    const target = event.currentTarget;
    if (
      target instanceof HTMLElement &&
      target.hasPointerCapture(event.pointerId)
    ) {
      target.releasePointerCapture(event.pointerId);
    }
    isDragging = false;
    dragDeltaX = 0;
    pointerId = null;
  };

  const onPointerUp = (event: PointerEvent) => {
    if (!isDragging || pointerId !== event.pointerId) return;
    const deltaX = event.clientX - dragStartX;
    const deltaY = event.clientY - dragStartY;
    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);
    const target = event.currentTarget;
    if (absX > swipeThreshold && absX > absY) {
      if (deltaX < 0) {
        goNext();
      } else {
        goPrev();
      }
    } else if (absX < tapThreshold && absY < tapThreshold) {
      let localX = event.clientX;
      if (target instanceof HTMLElement) {
        const rect = target.getBoundingClientRect();
        localX = event.clientX - rect.left;
      }
      if (localX < frameWidth * 0.5) {
        goPrev();
      } else {
        goNext();
      }
    }
    isDragging = false;
    dragDeltaX = 0;
    if (
      target instanceof HTMLElement &&
      pointerId !== null &&
      target.hasPointerCapture(pointerId)
    ) {
      target.releasePointerCapture(pointerId);
    }
    pointerId = null;
  };

  onMount(() => {
    mounted = true;
    syncFromUrl();
    updateUrl(currentIndex);
    preloadNext(preloadCount);
    window.addEventListener("keydown", onKeydown);
    window.addEventListener("popstate", syncFromUrl);
    return () => {
      window.removeEventListener("keydown", onKeydown);
      window.removeEventListener("popstate", syncFromUrl);
    };
  });
</script>

<div class="slider">
  {#if images.length > 0}
    {#key currentIndex}
      <div
        class="frame"
        style={`transform: translateX(${isDragging ? dragDeltaX : 0}px);`}
        on:pointerdown={onPointerDown}
        on:pointermove={onPointerMove}
        on:pointerup={onPointerUp}
        on:pointercancel={onPointerCancel}
      >
        <picture>
          {#each images[currentIndex].sources as source}
            <source type={source.type} srcset={source.srcset} sizes={source.sizes} />
          {/each}
          <img
            src={images[currentIndex].fallback.src}
            srcset={images[currentIndex].fallback.srcset}
            sizes={images[currentIndex].fallback.sizes}
            width={images[currentIndex].fallback.width}
            height={images[currentIndex].fallback.height}
            alt={images[currentIndex].alt}
            loading="eager"
            decoding="async"
            draggable={false}
          />
        </picture>
      </div>
    {/key}
  {:else}
    <div class="empty">No images available yet.</div>
  {/if}

  <div class="controls">
    <button type="button" on:click={goPrev} aria-label="Previous image">
      ←
    </button>
    <div class="counter" aria-live="polite">
      {currentIndex + 1} / {images.length}
    </div>
    <button type="button" on:click={goNext} aria-label="Next image">
      →
    </button>
  </div>
  <div class="hint">Swipe or tap left/right</div>

</div>

<style>
  .slider {
    position: relative;
    display: grid;
    gap: 1.5rem;
    align-items: center;
  }

  .frame {
    width: 100%;
    height: min(82vh, 980px);
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 1.5rem;
    background: rgba(16, 15, 13, 0.72);
    backdrop-filter: blur(12px);
    padding: 0.5rem;
    overflow: hidden;
    border: 1px solid rgba(231, 226, 216, 0.08);
    transition: transform 0.2s ease, border-color 0.2s ease;
    touch-action: pan-y;
    cursor: grab;
    user-select: none;
  }

  .frame:active {
    cursor: grabbing;
  }

  .frame picture {
    max-width: 100%;
    max-height: 100%;
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    flex: 1;
    min-width: 0;
    min-height: 0;
  }

  .frame img {
    max-width: 100%;
    max-height: 100%;
    width: 100%;
    height: 100%;
    object-fit: contain;
    display: block;
  }

  .controls {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    font-family: "Space Grotesk", "Arial", sans-serif;
    text-transform: uppercase;
    letter-spacing: 0.2em;
    font-size: 0.7rem;
  }

  .controls button {
    border: 1px solid rgba(231, 226, 216, 0.18);
    padding: 0.4rem 0.75rem;
    border-radius: 999px;
    background: #171614;
    color: var(--ink);
    transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
    font-size: 0.8rem;
    letter-spacing: 0.1em;
  }

  .controls button:hover {
    transform: translateY(-2px);
    border-color: rgba(231, 226, 216, 0.35);
    box-shadow: 0 12px 24px rgba(0, 0, 0, 0.4);
  }

  .counter {
    color: rgba(231, 226, 216, 0.6);
  }

  .hint {
    text-align: center;
    font-size: 0.6rem;
    letter-spacing: 0.25em;
    text-transform: uppercase;
    color: rgba(231, 226, 216, 0.45);
  }

  .empty {
    padding: 4rem 2rem;
    text-align: center;
    border-radius: 1rem;
    border: 1px dashed rgba(231, 226, 216, 0.25);
    color: rgba(231, 226, 216, 0.7);
  }

  @media (max-width: 720px) {
    .frame {
      height: 70vh;
      height: min(70svh, 900px);
      padding: 0.25rem;
      border-radius: 1rem;
    }

    .controls {
      gap: 0.75rem;
    }

    .controls button {
      flex: 1;
      min-height: 44px;
      padding: 0.6rem 1rem;
    }
  }
</style>

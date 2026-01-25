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
  let touchStartX = 0;
  let touchStartY = 0;
  let isTouching = false;
  const swipeThreshold = 40;
  const dragThreshold = 60;
  let dragStartX = 0;
  let dragStartY = 0;
  let dragDeltaX = 0;
  let isDragging = false;
  let wasDragging = false;

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

  const preloadNext = (count: number) => {
    if (images.length === 0 || typeof window === "undefined") return;
    const max = Math.min(count, images.length - 1);
    for (let offset = 1; offset <= max; offset += 1) {
      const index = clampIndex(currentIndex + offset);
      const image = images[index];
      if (preloaded.has(image.fileName)) continue;
      const img = new Image();
      img.srcset = image.fallback.srcset;
      img.sizes = image.fallback.sizes;
      img.src = image.fallback.src;
      preloaded.add(image.fileName);
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

  const onTouchStart = (event: TouchEvent) => {
    if (event.touches.length !== 1) return;
    const touch = event.touches[0];
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
    isTouching = true;
  };

  const onTouchMove = (event: TouchEvent) => {
    if (!isTouching || event.touches.length !== 1) return;
    const touch = event.touches[0];
    const deltaX = touch.clientX - touchStartX;
    const deltaY = touch.clientY - touchStartY;
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > swipeThreshold) {
      if (deltaX < 0) {
        goNext();
      } else {
        goPrev();
      }
      isTouching = false;
    }
  };

  const onTouchEnd = () => {
    isTouching = false;
  };

  const onPointerDown = (event: PointerEvent) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    dragStartX = event.clientX;
    dragStartY = event.clientY;
    dragDeltaX = 0;
    isDragging = true;
    wasDragging = false;
  };

  const onPointerMove = (event: PointerEvent) => {
    if (!isDragging) return;
    const deltaX = event.clientX - dragStartX;
    const deltaY = event.clientY - dragStartY;
    if (Math.abs(deltaY) > Math.abs(deltaX)) return;
    dragDeltaX = deltaX;
    if (Math.abs(deltaX) > 4) {
      wasDragging = true;
    }
  };

  const onPointerUp = () => {
    if (!isDragging) return;
    if (Math.abs(dragDeltaX) > dragThreshold) {
      if (dragDeltaX < 0) {
        goNext();
      } else {
        goPrev();
      }
    }
    isDragging = false;
    dragDeltaX = 0;
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
        on:touchstart={onTouchStart}
        on:touchmove={onTouchMove}
        on:touchend={onTouchEnd}
        on:touchcancel={onTouchEnd}
        on:pointerdown={onPointerDown}
        on:pointermove={onPointerMove}
        on:pointerup={onPointerUp}
        on:pointercancel={onPointerUp}
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
    <div class="counter">
      {currentIndex + 1} / {images.length}
    </div>
    <button type="button" on:click={goNext} aria-label="Next image">
      →
    </button>
  </div>
  <div class="hint">Use ← →</div>

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
      height: 60vh;
    }

    .controls {
      flex-direction: column;
    }
  }
</style>

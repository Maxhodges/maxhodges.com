<script lang="ts">
  import { onMount } from "svelte";

  export type GallerySource = {
    type: string;
    srcset: string;
    sizes: string;
  };

  export type GalleryImage = {
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

  const onKeydown = (event: KeyboardEvent) => {
    if (event.key === "ArrowRight") {
      goNext();
    }
    if (event.key === "ArrowLeft") {
      goPrev();
    }
  };

  onMount(() => {
    window.addEventListener("keydown", onKeydown);
    return () => window.removeEventListener("keydown", onKeydown);
  });
</script>

<div class="slider">
  {#if images.length > 0}
    {#key currentIndex}
      <div class="frame">
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
          />
        </picture>
      </div>
    {/key}
  {:else}
    <div class="empty">No images available yet.</div>
  {/if}

  <div class="controls">
    <button type="button" on:click={goPrev} aria-label="Previous image">
      Prev
    </button>
    <div class="counter">
      {currentIndex + 1} / {images.length}
    </div>
    <button type="button" on:click={goNext} aria-label="Next image">
      Next
    </button>
  </div>

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
    padding: 0.6rem 1.4rem;
    border-radius: 999px;
    background: #171614;
    color: var(--ink);
    transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
  }

  .controls button:hover {
    transform: translateY(-2px);
    border-color: rgba(231, 226, 216, 0.35);
    box-shadow: 0 12px 24px rgba(0, 0, 0, 0.4);
  }

  .counter {
    color: rgba(231, 226, 216, 0.6);
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

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
      <picture class="frame">
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
    height: min(75vh, 900px);
    display: grid;
    place-items: center;
    border-radius: 1.5rem;
    background: rgba(255, 255, 255, 0.6);
    backdrop-filter: blur(12px);
    overflow: hidden;
  }

  img {
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

  button {
    border: 1px solid rgba(27, 26, 22, 0.2);
    padding: 0.6rem 1.4rem;
    border-radius: 999px;
    background: white;
    transition: transform 0.2s ease, box-shadow 0.2s ease;
  }

  button:hover {
    transform: translateY(-2px);
    box-shadow: 0 12px 24px rgba(27, 26, 22, 0.15);
  }

  .counter {
    color: rgba(27, 26, 22, 0.6);
  }

  .empty {
    padding: 4rem 2rem;
    text-align: center;
    border-radius: 1rem;
    border: 1px dashed rgba(27, 26, 22, 0.25);
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

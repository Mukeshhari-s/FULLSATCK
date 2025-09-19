import React from "react";
import Particles from "react-tsparticles";
import { loadFull } from "tsparticles";

export default function TsparticlesBG() {
  const particlesInit = async (main) => {
    await loadFull(main);
  };

  return (
    <Particles
      id="tsparticles"
      init={particlesInit}
      options={{
        fullScreen: { enable: true, zIndex: -1 },
        background: {
          color: { value: "#1a2233" },
        },
        fpsLimit: 60,
        detectRetina: true,
        particles: {
          number: { value: 40, density: { enable: true, area: 800 } },
          shape: {
            type: ["image"],
            image: [
              { src: "https://particles.js.org/images/fruits/apple.png", width: 48, height: 48 },
              { src: "https://particles.js.org/images/fruits/avocado.png", width: 48, height: 48 },
              { src: "https://particles.js.org/images/fruits/banana.png", width: 48, height: 48 },
              { src: "https://particles.js.org/images/fruits/berries.png", width: 48, height: 48 },
              { src: "https://particles.js.org/images/fruits/cherry.png", width: 48, height: 48 },
              { src: "https://particles.js.org/images/fruits/grapes.png", width: 48, height: 48 },
              { src: "https://particles.js.org/images/fruits/lemon.png", width: 48, height: 48 },
              { src: "https://particles.js.org/images/fruits/orange.png", width: 48, height: 48 },
              { src: "https://particles.js.org/images/fruits/peach.png", width: 48, height: 48 },
              { src: "https://particles.js.org/images/fruits/pear.png", width: 48, height: 48 },
              { src: "https://particles.js.org/images/fruits/pepper.png", width: 48, height: 48 },
              { src: "https://particles.js.org/images/fruits/plum.png", width: 48, height: 48 },
              { src: "https://particles.js.org/images/fruits/star.png", width: 48, height: 48 },
              { src: "https://particles.js.org/images/fruits/strawberry.png", width: 48, height: 48 },
              { src: "https://particles.js.org/images/fruits/watermelon.png", width: 48, height: 48 },
              { src: "https://particles.js.org/images/fruits/watermelon_slice.png", width: 48, height: 48 }
            ]
          },
          opacity: { value: 1 },
          size: { value: 40, random: { enable: true, minimumValue: 32 } },
          move: {
            enable: true,
            speed: 1.2,
            direction: "none",
            random: false,
            straight: false,
            outModes: { default: "out" },
            attract: { enable: false }
          },
          links: {
            enable: false
          }
        },
        interactivity: {
          detectsOn: "window",
          events: {
            onHover: { enable: true, mode: "bubble" },
            onClick: { enable: true, mode: "push" },
            resize: true
          },
          modes: {
            bubble: { distance: 300, duration: 2, opacity: 1, size: 60 },
            push: { quantity: 4 }
          }
        }
      }}
    />
  );
}

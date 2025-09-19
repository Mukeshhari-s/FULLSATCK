import { useCallback, useEffect } from "react";
import Particles from "react-tsparticles";
import { loadFull } from "tsparticles";
import "./ParticlesBackground.css";

const ParticlesBackground = () => {
  const particlesInit = useCallback(async (engine) => {
    await loadFull(engine);
  }, []);

  useEffect(() => {
    // Add class to body to prevent white flash
    document.body.classList.add('dark-background');
    return () => {
      document.body.classList.remove('dark-background');
    };
  }, []);

  return (
    <Particles
      id="tsparticles"
      init={particlesInit}
      options={{
        fullScreen: {
          enable: true,
          zIndex: -2
        },
        background: {
          color: "#1a1a1a"
        },
        fpsLimit: 60,
        particles: {
          color: {
            value: "#d4af37"
          },
          links: {
            color: "#d4af37",
            distance: 150,
            enable: true,
            opacity: 0.15,
            width: 1.5,
            triangles: {
              enable: true,
              opacity: 0.05
            }
          },
          move: {
            enable: true,
            outModes: {
              default: "bounce"
            },
            random: true,
            speed: 1.5,
            straight: false,
            attract: {
              enable: true,
              rotateX: 600,
              rotateY: 1200
            }
          },
          number: {
            density: {
              enable: true,
              area: 900
            },
            value: 100
          },
          opacity: {
            value: 0.4,
            random: true,
            anim: {
              enable: true,
              speed: 0.5,
              minimumValue: 0.1,
              sync: false
            }
          },
          shape: {
            type: ["circle", "triangle", "star"],
            options: {
              star: {
                sides: 5
              }
            }
          },
          size: {
            value: { min: 1, max: 4 },
            random: true,
            anim: {
              enable: true,
              speed: 2,
              minimumValue: 0.5,
              sync: false
            }
          }
        },
        detectRetina: true
      }}
    />
  );
};

export default ParticlesBackground;
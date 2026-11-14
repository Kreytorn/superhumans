# SuperHumans

**A crew-health instrument for astronauts: six AI health checks that run on real medical data inside the browser, each ending in what to do next.**

Built by Team SuperHumans at the NASA Space Apps Challenge 2026 (Istanbul) for the challenge "Create Health Monitoring Software for Astronauts on Space Missions". Far from Earth, a crew cannot wait for a specialist on the ground. SuperHumans gives the first reading, and the next step, to the crew itself. There is no server: the models download to the device and run there.

## The six checks

| Check | What it does |
|---|---|
| **TrackTrace** | Circles DNA-damage spots in a cell nucleus and traces the straight path of a heavy ion. Runs our own model, IonScan, trained on NASA's BPS Microscopy data. |
| **BubbleGrade** | Listens to heart Doppler audio after a spacewalk and grades the gas bubbles that cause the bends. |
| **SpikeCount** | Outlines every red blood cell in a microscope photo and grades the spiky shapes of space anemia. |
| **VeinSqueeze** | Reads a vein-ultrasound clip as an AI second opinion: a clot is a vein that will not squash. |
| **BrainDrift** | Maps a brain MRI and measures the fluid spaces and the upward shift seen after long flights. |
| **Garn Meter** | Space sickness in "Garns". The crew member's own check-in drives it; our EEG model is shown as an honest "does not work yet". |

Each check shows a real sample, runs the model on one press, draws what it found on the sample, and ends with who acts and what to do. The evidence, sources and limits sit one tap away.

## Run it

You need Node.js 22.12 or newer and a browser with WebGPU (current Chrome or Edge). Without WebGPU the models fall back to WebAssembly and run more slowly.

```bash
npm ci            # install the exact dependency versions
npm run dev       # development server on http://localhost:5173
npm run build     # type-check and build the static site into dist/
npm run desktop   # build, then open the same app as a desktop window (Electron)
```

`dist/` is a static site and can be hosted anywhere. Other scripts: `npm run preview` serves the built site locally, `npm run lint` runs the linter, and `npm run pack` builds a Windows desktop package.

## How it is built

- `src/engine/<check>/`: one engine per check, plain TypeScript with no user interface. Each has `load()`, `listSamples()`, `analyze()` (the real model, live), `replay()` (stored outputs of the same model, no model download) and `act()` (who acts and what to do).
- `public/<check>/`: the model files (ONNX), the sample data and a `manifest.json` that lists every file with its size, sha256, licence and credit.
- `src/lib/infer/`: runs the models with ONNX Runtime Web, on WebGPU first and WebAssembly as the fallback.
- `electron/`: the desktop wrapper around the same build.
- `scripts/gen-credits.mjs`: writes `THIRD_PARTY.md` and `src/data/credits.json` from the installed packages and the six manifests, and lists anything whose licence is missing or not open.

Stack: TypeScript, React, Vite, three.js, ONNX Runtime Web, Electron. The models were trained in Python with PyTorch.

## Where the models and the data come from

We trained the models during the hackathon on openly published research data, starting from openly licensed pretrained networks. The app contains no astronaut data and no personal data: people and animals in the samples appear only under neutral ids.

The data includes NASA's BPS Microscopy benchmark from NASA Open Science study OSD-366 (TrackTrace), a Doppler audio archive of divers (BubbleGrade), the RedTell red-cell set (SpikeCount), the ThrombUS+ ultrasound set (VeinSqueeze), OASIS-1 and OpenNeuro brain MRI (BrainDrift) and a VR-sickness EEG study (Garn Meter).

**[THIRD_PARTY.md](THIRD_PARTY.md) is the full list**: every dataset, model weight, media file, library, font and tool, with its licence and credit line. Some data keeps a licence of its own that differs from the code's: the Doppler clips in `public/bubblegrade/` are GPL-3.0-or-later (see `public/bubblegrade/LICENSE-DATA.txt`), and the brain crops follow the OASIS Data Use Terms.

## What this is not

A hackathon prototype, not a medical device. It does not diagnose anything. No astronaut data is public, so every model learned from stand-ins on the ground: mouse cells under an accelerator beam, divers, lab blood from healthy donors, hospital leg-vein scans, brain MRI of people on Earth, and a virtual-reality sickness study. The brain "flight" is a simulation. The decision thresholds are our own product rules. Each check states in the app how well it works and where it fails.

## Use of Super Intelligence (AI)

This project was built with AI tools, and we disclose it as the Space Apps rules ask.

- **Claude by Anthropic** (through Claude Code) wrote the code in this repository and the Python scripts that trained the models, drew the IonScan architecture diagram (`public/tracktrace/ionscan_architecture.svg`, as LaTeX/TikZ code) and helped with research and documentation.
- **Humans chose the idea and the six checks**, directed the work, ran the training and checked the results.
- **No AI-generated images or video** are used, except those that carry a visible "AI-generated" mark. The health data shown is real published research data; none of it was generated.
- Pretrained open models were used as starting points or helpers (MobileNetV4 weights from timm, the OpenMind brain-MRI encoder, SAM 2.1, HD-BET). They are listed in THIRD_PARTY.md.

## Licence

Code, text, figures and our trained model weights: **MIT**, Copyright (c) 2026 Team SuperHumans. See [LICENSE](LICENSE).

Third-party data, weights, libraries and fonts keep their own licences. See [THIRD_PARTY.md](THIRD_PARTY.md).

This project is not affiliated with or endorsed by NASA. It uses NASA open data and public NASA documents, cited in THIRD_PARTY.md and in the app.

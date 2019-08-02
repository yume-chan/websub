# WebSub

The name needs to be changed because it's already been used!

- [WebSub](#websub)
  - [Features](#features)
  - [Roadmap](#roadmap)
  - [Directory structure](#directory-structure)

## Features

* A dark, cool UI that is basically a copy of Visual Studio Code and its Dark+ theme.
* Open and parse ass files
* Edit event text (with multi-line support)
* Save ass files

## Roadmap

High priority

* [ ] (Working on) Switch event type (Dialog or Comment)
* [ ] Create new event
* [ ] Directly edit event time
* [ ] Select event style
* [ ] Audio visualization
* [ ] Edit event time on audio visualization
* [ ] Select multiple events
* [ ] Merge multiple events

Low priority

* [ ] Karaoke mode

## Directory structure

* `ass.ts`: ass parsing library
* `flv.ts`: some random testing about flv file format, not that useful
* `fragment-test.ts`: some random testing about MP4 file sliceing, not that useful now.
* `resample-audio.worker.ts`: Loading with the Webpack Worker Loader, used to decrease sample rate of PCM audio, to decrease compute power needed in audio visualization.
* `sample-test.ts`: As the name suggests, it's a test. Testing slicing MP4 files into segments, decoding audio segments into PCM (becase the HTML5 Audio API can only decode the whole input so feed an one-hour MP4 file into it will blow up your RAM).
* `welcome.ts`: UI for selecting video and ass files
* `editor`
  * `auto-resize-textarea.ts`: A multi-line text input component that will automatically adjust its height to fit its content.
  * `menu/index.ts`: A menu component that looks and functions like Visual Studio Code's custom menu.
  * `select/index.ts`: (Work in Progress) A dropdown select component.

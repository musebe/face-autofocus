import React, { useRef, useState } from "react";
import { AdvancedVideo } from "@cloudinary/react";
import { Cloudinary } from "@cloudinary/url-gen";

import { fill } from "@cloudinary/url-gen/actions/resize";
import { FocusOn } from "@cloudinary/url-gen/qualifiers/focusOn";
import { Gravity } from "@cloudinary/url-gen/qualifiers";
import { AutoFocus } from "@cloudinary/url-gen/qualifiers/autoFocus";

const HTTP_SUCCESS = 200;
const VIDEO_HEIGHT = 450;
const VIDEO_WIDTH = 800;

const cld = new Cloudinary({
  cloud: {
    cloudName: "hackit-africa",
  },
});

export default function Home() {
  let recordedChunks = [];
  let localStream = null;
  let options = { mimeType: "video/webm; codecs=vp9" };
  let mediaRecorder = null;

  const rawVideo = useRef();
  const [publicID, setPublicID] = useState();

  function readFile(file) {
    console.log("readFile()=>", file);
    return new Promise(function (resolve, reject) {
      let fr = new FileReader();

      fr.onload = function () {
        resolve(fr.result);
      };

      fr.onerror = function () {
        reject(fr);
      };

      fr.readAsDataURL(file);
    });
  }

  const uploadVideo = async (base64) => {
    console.log("uploading to backend...");
    try {
      fetch("/api/upload", {
        method: "POST",
        body: JSON.stringify({ data: base64 }),
        headers: { "Content-Type": "application/json" },
      }).then((response) => {
        if (response.status === HTTP_SUCCESS) {
          response.json().then((result) => {
            console.log(result);
            setPublicID(result.public_id);
          });
        }
        console.log("successfull session", response.status);
      });
    } catch (error) {
      console.error(error);
    }
  };

  const startCamHandler = async () => {
    console.log("Starting webcam and mic ..... ");
    localStream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: false,
    });
    rawVideo.current.srcObject = localStream;
    rawVideo.current.addEventListener("loadeddata", (ev) => {
      console.log("loaded data.");
    });

    mediaRecorder = new MediaRecorder(localStream, options);
    mediaRecorder.ondataavailable = (event) => {
      console.log("data-available");
      if (event.data.size > 0) {
        recordedChunks.push(event.data);
      }
    };
    mediaRecorder.start();
  };

  const stopCamHandler = () => {
    console.log("Hanging up the call ...");
    localStream.getTracks().forEach((track) => track.stop());

    mediaRecorder.onstop = async (event) => {
      let blob = new Blob(recordedChunks, {
        type: "video/webm",
      });

      // Save original video to cloudinary
      await readFile(blob).then((encoded_file) => {
        uploadVideo(encoded_file);
      });
    };
  };

  const myVideo = cld.video(publicID);
  // Apply the transformation.
  myVideo.resize(
    fill()
      .width(VIDEO_WIDTH)
      .height(VIDEO_HEIGHT)
      .gravity(
        Gravity.autoGravity().autoFocus(AutoFocus.focusOn(FocusOn.faces()))
      )
  );

  return (
    <div className="container">
      <h1>Auto-focusing faces in web-cam videos using next js</h1>
      <div className="row">
        <div className="column">
          <video
            className="display"
            width={VIDEO_WIDTH}
            height={VIDEO_HEIGHT}
            ref={rawVideo}
            autoPlay
            playsInline
          />
        </div>
        <div className="column">
          {publicID && <AdvancedVideo cldVid={myVideo} controls />}
        </div>

      </div>
      <div className="row">
        <div className="column">
          <div className="buttons">
            <button className="button" onClick={startCamHandler}>
              Start Webcam
            </button>{' '}
            <button id="close" className="button" onClick={stopCamHandler}>
              Close and upload original video
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

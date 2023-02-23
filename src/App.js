import { useEffect, useRef, useState } from 'react';
import './App.css';
import {Howl} from 'howler';
import warn from "./assets/warn.mp3"

var sound = new Howl({
  src: [warn]
});


const mobilenetModule = require('@tensorflow-models/mobilenet');
const knnClassifier = require('@tensorflow-models/knn-classifier');

const NOT_WARNING = "NOT_WARNING"
const WARNING = "WARNING"
const TRANING_TIME = 50


function App() {
  const video = useRef();
  const classifier = useRef();
  const canPlayAudio = useRef(true);
  const mobilenet = useRef();
  const [touch, setTouched] = useState(false)
  const [btn, setBtn] = useState(false)

  const init = async () => {
    console.log("init...")
    await setupCamera()
    classifier.current = knnClassifier.create();
    mobilenet.current = await mobilenetModule.load();
    console.log("done camera")
    setBtn(true)
  }

  const setupCamera = () => {
    return new Promise((resolve, reject) => {
      navigator.getUserMedia = navigator.getUserMedia ||
      navigator.webkitGetUserMedia

      if (navigator.getUserMedia) {
        navigator.getUserMedia(
          {
            video : true
          },
          stream => {
            video.current.srcObject = stream
            video.current.addEventListener("loadeddata", resolve)
          },
          error => reject(error)
        )
      } else {
        reject();
      }
    })
  }

  const train = async label =>  {
    console.log(`${label} Tranning`)
    for (let index = 0; index < TRANING_TIME; ++index) {
      console.log(`Progress ${parseInt((index + 1) / TRANING_TIME * 100)}%`)
      await training(label)
    }
  }

  const training = label => {
    return new Promise( async (resolve) => {
      const embedding = mobilenet.current.infer(
        video.current,
        true
      )
      classifier.current.addExample(embedding, label)
      await sleep(100)
      resolve()
    })
  }

  const run = async () => {
    const embedding = mobilenet.current.infer(
      video.current,
      true
    )

    const result = await classifier.current.predictClass(
      embedding
    )

    if(result.label === WARNING && 
      result.confidences[result.label] > 0.8
      ) {
        console.log("WARNING")
        setTouched(true)
        if (canPlayAudio.current) {
          canPlayAudio.current = false
          sound.play();
        }

    }else{
      console.log("NOT_WARNING")
      setTouched(false)
    }

    await sleep(200)

    run()
  }

  const sleep = (ms = 0) => {
    return new Promise(resolve => setTimeout(resolve,ms)
    )
  }

  useEffect(() => {
    init()
    sound.on('end', function(){
      canPlayAudio.current = true
    });

    return () => {

    }
    // eslint-disable-next-line
  }, [])

  return (
      // <div>Hello world</div>


    <div className="App">
      <video 
          ref={video}
          className={touch ? `video warning` : "video"}
          autoPlay
      />
      {btn ? <div className='control'>
          <button className='btn' onClick={() => train(NOT_WARNING)}>Train</button>
          <button className='btn' onClick={() => train(WARNING)}>Train Warning</button>
          <button className='btn' onClick={() => run()}>Run</button>
      </div> : <div></div>}
      
      
    </div>
  );
}


export default App;

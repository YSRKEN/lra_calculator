import React, { FormEvent, useRef, useState } from 'react';
import { Button, Col, Container, Form, Row } from 'react-bootstrap';

const readFileAsArrayBuffer = (file: File): Promise<ArrayBuffer> => {
  return new Promise((res, rej) => {
    const reader = new FileReader();
    reader.addEventListener('load', () => {
      const result = reader.result;
      if (result === null) {
        rej(new Error('ファイルが読み込めませんでした。'));
      } else if (typeof result === 'string') {
        rej(new Error('ファイル形式に誤りがあります。'));
      } else {
        res(result);
      }
    }, false);
    reader.readAsArrayBuffer(file);
  });
};

const decodeAudioFromArrayBuffer = (arrayBuffer: ArrayBuffer): Promise<AudioBuffer> => {
  return new Promise((res) => {
    const audioContext = new AudioContext();
    audioContext.decodeAudioData(arrayBuffer, (decodedData) => {
      res(decodedData);
    });
  });
};

const calcSignalLfilter = (b: number[], a: number[], data: Float32Array): Float32Array => {
  const outputData = new Array<number>(data.length);
  for (let i = 0; i < data.length; i += 1) {
    let sum = 0.0;
    for (let m = 0; m < b.length; m += 1) {
      const j = i - m;
      if (j >= 0) {
        sum += b[m] * data[i - m];
      }
    }
    for (let n = 1; n < a.length; n += 1) {
      const j = i - n;
      if (j >= 0) {
        sum -= a[n] * data[i - n];
      }
    }
    outputData[i] = sum / a[0];
  }
  return new Float32Array(outputData);
};

const arrayDot = (a: number[] | Float32Array, b: number[] | Float32Array) => {
  let sum = 0.0;
  const len = a.length;
  for (let i = 0; i < len; i += 1) {
    sum += a[i] * b[i];
  }
  return sum;
};

const arraySum = (a: number[] | Float32Array) => {
  let sum = 0.0;
  const len = a.length;
  for (let i = 0; i < len; i += 1) {
    sum += a[i];
  }
  return sum;
};

/**
 * LRAを計算する。移植前コードを書いた人：avaris(Twitter ID: @Plz_Unlock_Me)
 */
const calcLRA = (pcmDataL: Float32Array, pcmDataR: Float32Array, samplingRate: number) => {
  // K - weighting filter
  const A = Math.pow(10, 4.0 / 40);
  let w0 = 2.0 * Math.PI * (1500.0 / samplingRate);
  let alpha = Math.sin(w0) / (2.0 / Math.sqrt(2));
  const b1 = [A * ((A + 1) + (A - 1) * Math.cos(w0) + 2 * Math.sqrt(A) * alpha), -2 * A * ((A - 1) + (A + 1) * Math.cos(w0)), A * ((A + 1) + (A - 1) * Math.cos(w0) - 2 * Math.sqrt(A) * alpha)];
  const a1 = [(A + 1) - (A - 1) * Math.cos(w0) + 2 * Math.sqrt(A) * alpha, 2 * ((A - 1) - (A + 1) * Math.cos(w0)), (A + 1) - (A - 1) * Math.cos(w0) - 2 * Math.sqrt(A) * alpha];
  w0 = 2.0 * Math.PI * (38 / samplingRate);
  alpha = Math.sin(w0) / (2.0 * 0.5);
  const b2 = [(1 + Math.cos(w0)) / 2, -(1 + Math.cos(w0)), (1 + Math.cos(w0)) / 2];
  const a2 = [1 + alpha, -2 * Math.cos(w0), 1 - alpha];
  console.log(`サンプリングレート：${samplingRate}[Hz]`);
  console.log(`データ長：${pcmDataL.length}`);
  console.log(`パラメーター：`);
  console.log(`　a1=${a1}, a2=${a2}, b1=${b1}, b2=${b2}`);

  const pcmDataL2 = calcSignalLfilter(b1, a1, pcmDataL);
  const pcmDataR2 = calcSignalLfilter(b1, a1, pcmDataR);
  const pcmDataL3 = calcSignalLfilter(b2, a2, pcmDataL2);
  const pcmDataR3 = calcSignalLfilter(b2, a2, pcmDataR2);

  // short term loudness
  // calcurate square average in 3000ms
  // shift: 100ms (overlap: 2900ms)
  // "the exact amount of overlap is implementation-dependent." in EBU Tech 3342
  const shift = Math.floor(1.0 * samplingRate / 10);
  const calcRange = 30;
  const N = Math.floor(10.0 * pcmDataL.length / samplingRate) - calcRange + 1;
  let stl = new Array<number>(N); // stl: short term loudness
  // Is zero padding needed?
  for (let i = 0; i < N; i += 1) {
    const tmpL = pcmDataL3.slice(i * shift, (i + calcRange) * shift);
    const tmpR = pcmDataR3.slice(i * shift, (i + calcRange) * shift);
    stl[i] = (arrayDot(tmpL, tmpL) + arrayDot(tmpR, tmpR)) / (3 * samplingRate);
  }
  // power to loudness
  // 0.691 is a magic number for regularization
  stl = stl.map(s => Math.log10(s) * 10 - 0.691);
  console.log(`　shift=${shift}, calcRange=${calcRange}, N=${N}`);

  // gating
  const absoluteThreshold = -70;
  stl = stl.filter(s => s > absoluteThreshold);
  const I = Math.log10(arraySum(stl.map(s => Math.pow(10.0, s / 10))) / stl.length) * 10;
  const relativeThreshold = I - 20;
  stl = stl.filter(s => s > relativeThreshold);
  console.log(`　absoluteThreshold=${absoluteThreshold}, I=${I}, relativeThreshold=${relativeThreshold}`);

  // output
  stl.sort();
  return stl[Math.floor(stl.length * 0.95)] - stl[Math.floor(stl.length * 0.10)];
};

const App: React.FC = () => {
  const [fileData, setFileData] = useState<File | null>(null);
  const [lra, setLRA] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);

  const readFile = (e: FormEvent<HTMLInputElement>) => {
    e.preventDefault();
    // ファイルの読み込み処理
    const fileList = e.currentTarget.files;
    if (fileList === null) {
      return;
    }
    const file = fileList.item(0);
    if (file === null) {
      return;
    }
    setFileData(file);
  };

  const startAnalysis = async () => {
    // ファイル未選択時は何もしない
    if (fileData === null) {
      return;
    }
    // ファイルを読み込む
    const arrayBuffer = await readFileAsArrayBuffer(fileData);
    // オーディオデータとしてパースする
    const audioData = await decodeAudioFromArrayBuffer(arrayBuffer);
    // LRAを計算する
    setLRA(`LRA：${calcLRA(audioData.getChannelData(0), audioData.getChannelData(1), audioData.sampleRate)}[LU]`);
  };

  return <Container>
    <Row className="my-3">
      <Col className="text-center">
        <h1>LRAを計算</h1>
      </Col>
    </Row>
    <Row className="my-3">
      <Col sm={6} className="mx-auto">
        <Form>
          <Form.Group>
            <Form.File ref={fileInput} label="音楽ファイルを選択してください。" onChange={readFile} />
          </Form.Group>
          <Form.Group>
            <Button disabled={fileData === null} onClick={startAnalysis}>解析開始</Button>
          </Form.Group>
          <Form.Group>
            <Form.Label>{lra}</Form.Label>
          </Form.Group>
        </Form>
      </Col>
    </Row>
  </Container>;
};

export default App;

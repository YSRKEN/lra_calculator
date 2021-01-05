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

const App: React.FC = () => {
  const [fileData, setFileData] = useState<File | null>(null);
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
    console.log(audioData);
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
        </Form>
      </Col>
    </Row>
  </Container>;
};

export default App;

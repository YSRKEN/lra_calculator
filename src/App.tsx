import React, { FormEvent, useRef, useState } from 'react';
import { Button, Col, Container, Form, Row } from 'react-bootstrap';

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

  const startAnalysis = () => {
    if (fileData !== null) {
      // 音楽ファイルを読み込む
      const reader = new FileReader();
      reader.addEventListener('load', () => {
        const result = reader.result;
        if (result !== null && typeof result !== 'string') {
          const audioContext = new AudioContext();
          audioContext.decodeAudioData(result, (decodedData) => {
            console.log(decodedData);
          });
        }
      }, false);
      reader.readAsArrayBuffer(fileData);
    }
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
            <Button onClick={startAnalysis}>解析開始</Button>
          </Form.Group>
        </Form>
      </Col>
    </Row>
  </Container>;
};

export default App;

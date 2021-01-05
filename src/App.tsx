import React from 'react';
import { Button, Col, Container, Form, Row } from 'react-bootstrap';

const App: React.FC = () => <Container>
  <Row className="my-3">
    <Col className="text-center">
      <h1>LRAを計算</h1>
    </Col>
  </Row>
  <Row className="my-3">
    <Col sm={6} className="mx-auto">
      <Form>
        <Form.Group>
          <Form.File label="音楽ファイルを選択してください。" />
        </Form.Group>
        <Form.Group>
          <Button>解析開始</Button>
        </Form.Group>
      </Form>
    </Col>
  </Row>
</Container>

export default App;

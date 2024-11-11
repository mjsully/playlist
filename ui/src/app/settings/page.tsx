"use client"; // This is a client component

import React, { useState, useEffect, useRef, Suspense } from 'react';
import Button from 'react-bootstrap/Button';
import Nav from 'react-bootstrap/Nav';
import Navbar from 'react-bootstrap/Navbar';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Container from 'react-bootstrap/Container';
import Spinner from 'react-bootstrap/Spinner';
import Modal from 'react-bootstrap/Modal';
import Icon from '@mdi/react';
import Form from 'react-bootstrap/Form';
import Toast from 'react-bootstrap/Toast';
import Card from 'react-bootstrap/Card';

import { mdiHeart, mdiInformation, mdiFilter, mdiCog, mdiRefresh } from '@mdi/js';

import 'bootstrap/dist/css/bootstrap.min.css';
import "bootstrap-icons/font/bootstrap-icons.css";
import './globals.css'

export default function MyApp() {

  // Preferences
  const [theme, setTheme] = useState(() => {
    const saved = window.localStorage.getItem("theme");
    return saved || 'dark';
  });
  const [databaseAddress, setDatabaseAddress] = useState(() => {
    const saved = window.localStorage.getItem("databaseAddress");
    return saved || 'http://localhost:8000';
  });

  const form = useRef(null);
  const [showAlert, setShowAlert] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [alertHeader, setAlertHeader] = useState(null);
  const [alertMessage, setAlertMessage] = useState(null);
  const [alertVariant, setalertVariant] = useState(null);

  function ResetAlert() {
    setShowAlert(false);
    setAlertHeader(null);
    setAlertMessage(null);
    setalertVariant(null);
  }

  function BuildAlert(header, message, colour) {
    ResetAlert();
    setAlertHeader(header);
    setAlertMessage(message);
    setalertVariant(colour);
    setShowAlert(true);
    ShowAlert();
  }

  function ShowAlert() {
    return (
      <div className="position-fixed bottom-0 end-0 px-4 py-2">
        <Toast show={showAlert && showNotifications} onClose={() => { ResetAlert() }} delay={3000} autohide bg={alertVariant}>
          <Toast.Header >
            <strong className="me-auto"> {alertHeader} </strong>
          </Toast.Header>
          <Toast.Body>
            {alertMessage}
          </Toast.Body>
        </Toast>
      </div>
    )
  }

  function handleSettingsChange(event) {
    event.preventDefault();
    ResetAlert();
    if (form.current.lightModeInput.checked) setTheme("light");
    if (form.current.darkModeInput.checked) setTheme("dark");
    setDatabaseAddress(form.current.databaseAddressInput.value);
    localStorage.setItem("databaseAddress", form.current.databaseAddressInput.value);
    if (form.current.lightModeInput.checked) localStorage.setItem("theme", "light");
    if (form.current.darkModeInput.checked) localStorage.setItem("theme", "dark");
    setShowNotifications(form.current.notificationsSelector.checked === true);
    localStorage.setItem("showNotifications", `${form.current.notificationsSelector.checked === true}`);
    BuildAlert("Settings", "Settings changes have been saved!", "success");
  }

  function SettingsForm() {
    return (
      <Container fluid="sm">
        <Form ref={form} onSubmit={handleSettingsChange}>
          <h2> App settings</h2>
          <hr></hr>
          <Form.Label htmlFor="databaseSelector">
            Database address and port
          </Form.Label>
          <div className="mb-2">
            <Form.Control
              id="databaseAddressInput"
              name="databaseAddressInput"
              defaultValue={databaseAddress}
            >
            </Form.Control>
          </div>
          <hr></hr>
          <Form.Label htmlFor="themeSwitcher">
            Colour theme
          </Form.Label>
          <div>
            <Form.Check
              type="radio"
              label="Light mode"
              id="lightModeInput"
              name="themeSelector"
              defaultChecked={(theme === "light")}
            />
            <Form.Check
              type="radio"
              label="Dark mode"
              id="darkModeInput"
              name="themeSelector"
              defaultChecked={(theme === "dark")}
            />
          </div>
          <hr></hr>
          <div className="mb-2">
            <Form.Check
              type="switch"
              label="Toast notifications"
              id="notificationsSelector"
              name="notificationsSelector"
              defaultChecked={(showNotifications === true)}
            />
          </div>
          <hr></hr>
          <div className="d-flex">
            <Button className="ms-auto me-auto mt-2 mb-2 w-100" variant="primary" onClick={handleSettingsChange}>Save changes</Button>
          </div>
        </Form>
      </Container>
    )

  }

  useEffect(() => {
    const lsDatabaseAddress = localStorage.getItem("databaseAddress");
    const lsNotifications = localStorage.getItem("showNotifications");
    lsNotifications === null ? setShowNotifications(true) : setShowNotifications(lsNotifications === 'true');
  }, [])

  useEffect(() => {
    document.documentElement.setAttribute("data-bs-theme", theme);
  }, [theme]);

  return (

    <Container className="px-0" fluid>
      <Navbar collapseOnSelect expand="md">
        <Container fluid>
          <Navbar.Brand href="#home" className="text-truncate"> <i className="bi-controller me-2"></i>Steam Dashboard</Navbar.Brand>
          <Navbar.Toggle aria-controls="basic-navbar-nav" data-bs-theme="dark" />
          <Navbar.Collapse id="basic-navbar-nav">
            <Nav className="w-100">
              {/* <Nav.Link href="#"> <StatsButton /> </Nav.Link>
                <Nav.Link href="#"> <FiltersButton /> </Nav.Link>
                <Nav.Link href="#"><LoadButton /> </Nav.Link>
                <Nav.Link href="#"><SettingsButton /></Nav.Link> */}
              <Nav.Link href="/steam"> Steam </Nav.Link>
              <Nav.Link href="#"> Other platforms </Nav.Link>
              <Nav.Link href="/settings" active> Settings </Nav.Link>
              {/* <Form inline className="d-flex">
                  <Row>
                    <Col xs="auto">
                      <Form.Control
                        type="text"
                        placeholder="Search"
                        className=" mr-sm-2 mt-2 mb-2"
                      />
                    </Col>
                    <Col xs="auto">
                      <Button className="mt-2 mb-2" type="submit">Submit</Button>
                    </Col>
                  </Row>
                </Form> */}
            </Nav>
          </Navbar.Collapse>
        </Container>
      </Navbar>
      <Container fluid>
        <Col>
          {<SettingsForm />}
          {<ShowAlert />}
        </Col>
      </Container>
    </Container>

  );

}

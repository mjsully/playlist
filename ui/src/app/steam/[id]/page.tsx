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
import Collapse from 'react-bootstrap/Collapse';
import Dropdown from 'react-bootstrap/Dropdown';
// import Form from 'react-bootstrap/Form';

import { useParams, useRouter } from 'next/navigation'

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

  // const [databaseAddress, setDatabaseAddress] = useState(null);
  const form = useRef(null);
  const sortDropdown = useRef(null);
  const orderDropdown = useRef(null);
  const [games, setGames] = useState(null);
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const [showAlert, setShowAlert] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [alertHeader, setAlertHeader] = useState(null);
  const [alertMessage, setAlertMessage] = useState(null);
  const [alertVariant, setalertVariant] = useState(null);

  const router = useRouter();
  const params = useParams();

  const GameCard = (props) => {

    function handleOnClick() {
      setFavourite(!favourite);
      fetch(`${databaseAddress}/steam/game/${props.game.id}/favourite`)
        .then((response) => response.json())
        .then((data) => {
          console.log(data)
        })
        .catch((err) => {
          console.log(err.message)
        })
    }

    const [favourite, setFavourite] = useState(() => {
      return props.game.favourite === 1;
    })

    return (
      <Container key={props.game.id}>
        <Card className="mt-2 mb-2" >
          <Card.Img src={props.game.img} alt={props.game.name}></Card.Img>
          <Card.ImgOverlay>
            <Card.Title className="text-truncate"> {props.game.name} </Card.Title>
            {
              props.game.unplayed ? (
                <Card.Text>
                  Unplayed
                </Card.Text>
              ) : (
                <Card.Text>
                  Playtime: {parseInt(Number(props.game.playtime_forever / 60))} hours <br></br>
                  Last played: {props.game.last_played} <br></br>
                  {/* Achievements: {props.game.achievements} */}
                </Card.Text>
              )
            }
            <Button id={props.game.id} className="ms-1 me-1 card-button btn btn-outline-primary" onClick={handleOnClick}>
              {
                favourite ? (
                  'Favourited'
                ) : (
                  'Add to favourites'
                )
              }
            </Button>
          </Card.ImgOverlay>
          {
            favourite == 1 &&
            <span className="position-absolute translate-middle top-0 start-100">
              <Icon path={mdiHeart} size={1} style={{ color: "#ff0000" }}></Icon>
            </span>
          }
        </Card>
      </Container>
    )
  }

  function FetchData() {

    setGames(null);
    setIsLoading(true);
    fetch(`${databaseAddress}/steam/game/${params["id"]}`)
      .then((response) => response.json())
      .then((data) => {
        setGames(data);
        console.log(data);
        setIsLoading(false);
        BuildAlert("Success", "Games list refreshed successfully", "success")
      })
      .catch((err) => {
        console.log(err.message)
      })
  }

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

  function Loading() {
    return (
      <Container className="d-flex align-items-center justify-content-center" style={{ minHeight: "80vh" }}>
        <Spinner animation="border" />
      </Container>
    )

  }

  useEffect(() => {
    const lsDatabaseAddress = localStorage.getItem("databaseAddress");
    const lsNotifications = localStorage.getItem("showNotifications");
    lsNotifications === null ? setShowNotifications(true) : setShowNotifications(lsNotifications === 'true');
    FetchData();
  }, [])

  var environment = process.env.NODE_ENV != "production" ? `(${process.env.NODE_ENV})` : ""

  return (

    <Container className="px-0" fluid>
      <Navbar collapseOnSelect expand="md">
        <Container fluid>
          {/* <Navbar.Brand href="#home" className="text-truncate"> <i className="bi-controller me-2"></i>Steam Dashboard {environment}</Navbar.Brand> */}
          <Navbar.Brand href="#home" className="text-truncate"> <i className="bi-controller me-2"></i>Steam Dashboard</Navbar.Brand>
          <Navbar.Toggle aria-controls="basic-navbar-nav" data-bs-theme="dark" />
          <Navbar.Collapse id="basic-navbar-nav">
            <Nav className="w-100">
              {/* <Nav.Link href="#"> <StatsButton /> </Nav.Link>
                <Nav.Link href="#"> <FiltersButton /> </Nav.Link>
                <Nav.Link href="#"><LoadButton /> </Nav.Link>
                <Nav.Link href="#"><SettingsButton /></Nav.Link> */}
              <Nav.Link href="/steam" active> Steam </Nav.Link>
              <Nav.Link href="#"> Other platforms </Nav.Link>
              <Nav.Link href="/settings"> Settings </Nav.Link>
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
      <Container className="container-body z-0" fluid>
        <Container fluid="xxl">
          <Col>
            <Suspense fallback={<Loading />}>
              
              {/* {<FiltersButton />}
              {<StatsButton />} */}
              {/* {<SortDropdown />}
              {<OrderDropdown />} */}
              <h1>
                {params["id"]}
              </h1>
              {isLoading && <Loading />}
              {<ShowAlert />}
            </Suspense>
          </Col>
        </Container>
      </Container>
    </Container>

  );

}

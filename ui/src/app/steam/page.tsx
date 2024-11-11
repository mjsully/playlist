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

import { mdiHeart, mdiInformation, mdiFilter, mdiCog, mdiRefresh } from '@mdi/js';

import 'bootstrap/dist/css/bootstrap.min.css';
import "bootstrap-icons/font/bootstrap-icons.css";
import './globals.css'

export default function MyApp() {

  // Filters

  const [alphabeticalSort, setAlphabeticalSort] = useState(() => {
    const saved = window.localStorage.getItem("alphabeticalSort");
    return saved !== null ? saved === 'true' : false;
  });
  const [playtimeSort, setPlaytimeSort] = useState(() => {
    const saved = window.localStorage.getItem("playtimeSort");
    return saved !== null ? saved === 'true' : true;
  });
  const [lastPlayedSort, setLastPlayedSort] = useState(() => {
    const saved = window.localStorage.getItem("lastPlayedSort");
    return saved !== null ? saved === 'true' : false;
  });
  const [ascendingSort, setAscendingSort] = useState(() => {
    const saved = window.localStorage.getItem("ascSort");
    return saved !== null ? saved === 'true' : false;
  });
  const [descendingSort, setDescendingSort] = useState(() => {
    const saved = window.localStorage.getItem("descSort");
    return saved !== null ? saved === 'true' : true;
  });
  const [playedFilter, setPlayedFilter] = useState(() => {
    const saved = window.localStorage.getItem("playedOnly");
    return saved !== null ? saved === 'true' : false;
  });
  const [unplayedFilter, setUnplayedFilter] = useState(() => {
    const saved = window.localStorage.getItem("unplayedOnly");
    return saved !== null ? saved === 'true' : false;
  });
  const [favouritesFilter, setFavouritesFilter] = useState(() => {
    const saved = window.localStorage.getItem("favouritesOnly");
    return saved !== null ? saved === 'true' : false;
  });
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

  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const closeSettingsModal = () => setShowSettingsModal(false);
  const openSettingsModal = () => setShowSettingsModal(true);

  const [showFiltersModal, setShowFiltersModal] = useState(false);
  const closeFiltersModal = () => setShowFiltersModal(false);
  const openFiltersModal = () => setShowFiltersModal(true);

  const [showStatsModal, setShowStatsModal] = useState(false);
  const closeStatsModal = () => setShowStatsModal(false);
  const openStatsModal = () => setShowStatsModal(true);

  const [showAlert, setShowAlert] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [alertHeader, setAlertHeader] = useState(null);
  const [alertMessage, setAlertMessage] = useState(null);
  const [alertVariant, setalertVariant] = useState(null);

  const [sort, setSort] = useState("playtime");
  const [order, setOrder] = useState("desc");
  const [open, setOpen] = useState(false);
  const [playedOnly, setPlayedOnly] = useState(null);
  const [playedOnlyRadioValue, setplayedOnlyRadioValue] = useState(null);
  const [unplayedOnlyRadio, setUnplayedOnlyRadio] = useState(null);
  // const handleFavourite = (game) => {

  //   setIsLoading(true);
  //   fetch(`/favourite?id=${game.target.id}`)
  //     .then((response) => response.json())
  //     .then((data) => {
  //       FetchData();
  //     })
  //     .catch((err) => {
  //       console.log(err.message)
  //     })
  // }

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

  const GameList = ({ list }) => {
    return (
      <Row md="2" lg="3">
        {list.map((game) => (
          <GameCard game={game} key={game.id} />
        ))}
      </Row>
    )
  }

  function FetchStats() {
    setStats(null);
    fetch(`${databaseAddress}/steam/stats`)
      .then((response) => response.json())
      .then((data) => {
        setStats(data);
      })
      .catch((err) => {
        console.log(err.message)
      })
  }

  function FetchData() {

    var sort = "";
    var order = "";
    var filter = "";

    if (alphabeticalSort) sort = "alphabetical";
    if (playtimeSort) sort = "playtime";
    if (lastPlayedSort) sort = "lastPlayed";
    ascendingSort === true ? order = "asc" : order = "desc";
    if (playedFilter) filter += "&playedOnly";
    if (unplayedFilter) filter += "&unplayedOnly";
    if (favouritesFilter) filter += "&favouritesOnly";

    setGames(null);
    setIsLoading(true);
    // console.log(Games)
    // ${databaseAddress}/
    fetch(`${databaseAddress}/steam/games?sort=${sort}&order=${order}${filter}`)
      .then((response) => response.json())
      .then((data) => {
        setGames(data);
        setIsLoading(false);
        BuildAlert("Success", "Games list refreshed successfully", "success")
        FetchStats();
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

  function StatsButton() {

    return (
      <Button className="ms-1 me-1" onClick={openStatsModal}>
        <Icon path={mdiInformation} size={1}></Icon>
        {/* Statistics */}
      </Button>
    );
  }

  function FiltersButton() {

    return (
      <Button className="ms-1 me-1" onClick={openFiltersModal}>
        <Icon path={mdiFilter} size={1}></Icon>
        {/* Filters */}
      </Button>
    );
  }

  function SettingsButton() {

    return (
      <Button className="ms-1 me-1" onClick={openSettingsModal}>
        <Icon path={mdiCog} size={1}></Icon>
        {/* Settings */}
      </Button>
    );
  }

  function LoadButton() {

    function handleClick() {
      setIsLoading(true);
      FetchData();
    }

    return (
      <Button className="ms-1 me-1" onClick={handleClick}>
        <Icon path={mdiRefresh} size={1}></Icon>
        {/* Refresh */}
      </Button>
    );
  }

  function Loading() {
    return (
      <Container className="d-flex align-items-center justify-content-center" style={{ minHeight: "80vh" }}>
        <Spinner animation="border" />
      </Container>
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
    closeSettingsModal();
  }

  function loadFilters() {
    localStorage.getItem("alphabeticalSort");
    localStorage.getItem("playtimeSort");
    localStorage.getItem("lastPlayedSort");
    localStorage.getItem("ascSort");
    localStorage.getItem("descSort");
    localStorage.getItem("playedOnly");
    localStorage.getItem("unplayedOnly");
    localStorage.getItem("favouritesOnly");
    setAlphabeticalSort(localStorage.getItem("alphabeticalSort") === "true");
    setPlaytimeSort(localStorage.getItem("playtimeSort") === "true");
    setLastPlayedSort(localStorage.getItem("lastPlayedSort") === "true");
    setAscendingSort(localStorage.getItem("ascSort") === "true");
    setDescendingSort(localStorage.getItem("descSort") === "true");
    setPlayedFilter(localStorage.getItem("playedOnly") === "true");
    setUnplayedFilter(localStorage.getItem("unplayedOnly") === "true");
    setFavouritesFilter(localStorage.getItem("favouritesOnly") === "true");
  }

  function handleFiltersChange(event) {
    event.preventDefault();
    localStorage.setItem("alphabeticalSort", `${form.current.alphabeticalSelector.checked === true}`);
    localStorage.setItem("playtimeSort", `${form.current.playtimeSelector.checked === true}`);
    localStorage.setItem("lastPlayedSort", `${form.current.lastPlayedSelector.checked === true}`);
    localStorage.setItem("ascSort", `${form.current.ascSelector.checked === true}`);
    localStorage.setItem("descSort", `${form.current.descSelector.checked === true}`);
    localStorage.setItem("playedOnly", `${form.current.playedSelector.checked === true}`);
    localStorage.setItem("unplayedOnly", `${form.current.unplayedSelector.checked === true}`);
    localStorage.setItem("favouritesOnly", `${form.current.favouritesSelector.checked === true}`);
    loadFilters();
    closeFiltersModal();
  }

  function handleFiltersReset(event) {
    event.preventDefault();
    localStorage.removeItem("alphabeticalSort");
    localStorage.removeItem("playtimeSort");
    localStorage.removeItem("lastPlayedSort");
    localStorage.removeItem("ascSort");
    localStorage.removeItem("descSort");
    localStorage.removeItem("playedOnly");
    localStorage.removeItem("unplayedOnly");
    localStorage.removeItem("favouritesOnly");
    setAlphabeticalSort(false);
    setPlaytimeSort(true);
    setLastPlayedSort(false);
    setAscendingSort(false);
    setDescendingSort(true);
    setPlayedFilter(false);
    setUnplayedFilter(false);
    setFavouritesFilter(false);
    closeFiltersModal();
  }

  function SettingsModal() {

    return (
      <Modal show={showSettingsModal}>
        <Modal.Header closeButton onClick={closeSettingsModal}>
          <Modal.Title> Settings </Modal.Title>
        </Modal.Header>

        <Modal.Body>
          <Form ref={form} onSubmit={handleSettingsChange}>
            <Form.Label htmlFor="databaseSelector">
              Database IP address (Current: {databaseAddress})
            </Form.Label>
            <div className="mb-2">
              <Form.Control
                id="databaseAddressInput"
                name="databaseAddressInput"
                defaultValue={databaseAddress}
              >
              </Form.Control>
            </div>
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
          </Form>
        </Modal.Body>

        <Modal.Footer>
          <Button variant="secondary" onClick={closeSettingsModal}>Close</Button>
          <Button variant="primary" onClick={handleSettingsChange}>Save changes</Button>
        </Modal.Footer>
      </Modal >
    )
  }

  function FiltersModal() {

    return (
      <Modal show={showFiltersModal}>
        <Modal.Header closeButton onClick={closeFiltersModal}>
          <Modal.Title> Filters </Modal.Title>
        </Modal.Header>

        <Modal.Body>
          <Form ref={form} onSubmit={handleFiltersChange}>
            <Form.Label htmlFor="orderSelector">
              Library sorting
            </Form.Label>
            <div>
              <Form.Check
                type="radio"
                label="Alphabetical"
                id="alphabeticalSelector"
                name="orderSelector"
                defaultChecked={(alphabeticalSort === true)}
              />
              <Form.Check
                type="radio"
                label="Playtime (hours)"
                id="playtimeSelector"
                name="orderSelector"
                defaultChecked={(playtimeSort === true)}
              />
              <Form.Check
                type="radio"
                label="Last played (date)"
                id="lastPlayedSelector"
                name="orderSelector"
                defaultChecked={(lastPlayedSort === true)}
              />
            </div>
            <Form.Label htmlFor="ascDescSelector">
              Ascending/descending
            </Form.Label>
            <div>
              <Form.Check
                type="radio"
                label="Ascending"
                id="ascSelector"
                name="ascDescSelector"
                defaultChecked={(ascendingSort === true)}
              />
              <Form.Check
                type="radio"
                label="Descending"
                id="descSelector"
                name="ascDescSelector"
                defaultChecked={(descendingSort === true)}
              />
            </div>
            <hr></hr>
            <div>
              <Form.Label htmlFor="ascDescSelector">
                Filters
              </Form.Label>
              <Form.Check
                type="switch"
                label="Played only"
                id="playedSelector"
                name="playedSelector"
                defaultChecked={(playedFilter === true)}
              />
              <Form.Check
                type="switch"
                label="Unplayed only"
                id="unplayedSelector"
                name="unplayedSelector"
                defaultChecked={(unplayedFilter === true)}
              />
              <Form.Check
                type="switch"
                label="Favourites only"
                id="favouritesSelector"
                name="favouritesSelector"
                defaultChecked={(favouritesFilter === true)}
              />
            </div>

          </Form>
        </Modal.Body>

        <Modal.Footer>
          <Button variant="secondary" onClick={closeFiltersModal}>Close</Button>
          <Button variant="warning" onClick={handleFiltersReset}>Reset</Button>
          <Button variant="primary" onClick={handleFiltersChange}>Apply</Button>
        </Modal.Footer>
      </Modal >
    )
  }

  function StatsModal() {

    return (
      <Modal show={showStatsModal}>
        <Modal.Header closeButton onClick={closeStatsModal}>
          <Modal.Title> Statistics </Modal.Title>
        </Modal.Header>

        <Modal.Body>
          <p> Total games owned: {stats && stats.count} </p>
          <p> Total playtime: {stats && Math.round(stats.playtime / 60)} hours </p>
          <p> Unplayed games owned: {stats && stats.unplayed} </p>
          <p> Last played: {stats && stats.last_played} </p>
          <p> Games on playlist: {stats && stats.favourites} </p>
        </Modal.Body>

        <Modal.Footer>
          <Button variant="secondary" onClick={closeStatsModal}>Close</Button>
        </Modal.Footer>
      </Modal >
    )
  }

  function HandleSortDropdownChange() {
    var value = sortDropdown.current.value;
    setSort(value);
    console.log(sort);
    if (value == "alphabetical") {
      setAlphabeticalSort(true);
      setPlaytimeSort(false);
      setLastPlayedSort(false);
    }
    if (value == "playtime") {
      setAlphabeticalSort(false);
      setPlaytimeSort(true);
      setLastPlayedSort(false);
    }
    if (value == "lastPlayed") {
      setAlphabeticalSort(false);
      setPlaytimeSort(false);
      setLastPlayedSort(true);
    }
  }

  function HandleOrderDropdownChange() {
    var value = orderDropdown.current.value;
    setOrder(value);
    if (value == "asc") {
      setAscendingSort(true);
      setDescendingSort(false);
    }
    if (value == "desc") {
      setAscendingSort(false);
      setDescendingSort(true);
    }
  }

  function SortDropdown() {
    return (
      <Form.Select ref={sortDropdown} aria-label="Default select example"
        value={sort}
        onChange={HandleSortDropdownChange}>
        <option>Open this select menu</option>
        <option value="alphabetical">Alphabetical</option>
        <option value="playtime">Playtime</option>
        <option value="lastPlayed">Last played</option>
      </Form.Select>
    )
  }
  function OrderDropdown() {
    return (
      <Form.Select ref={orderDropdown} aria-label="Default select example"
        value={order}
        onChange={HandleOrderDropdownChange}>
        <option>Open this select menu</option>
        <option value="asc">Ascending</option>
        <option value="desc">Descending</option>
      </Form.Select>
    )
  }
  function HandleRadioChange(event) {
    if (event.target.value == "playedOnly") {
      if (unplayedFilter == true) setUnplayedFilter(false);
      setPlayedFilter(event.target.checked);
    }
    if (event.target.value == "unplayedOnly") {
      if (playedFilter == true) setPlayedFilter(false);
      setUnplayedFilter(event.target.checked);
    }
    if (event.target.value == "favouritesOnly") setFavouritesFilter(event.target.checked);
  }
  function RadioButtons() {
    return (
      <Container>
        <Button className="w-100"
          onClick={() => setOpen(!open)}
          aria-controls="example-collapse-text"
          aria-expanded={open}
        >
          Filters
        </Button>
        <Collapse in={open}>
          <Form className="w-100">
            <div className="mb-1 mt-3">
              <Form.Select ref={sortDropdown} aria-label="Default select example"
                value={sort}
                onChange={HandleSortDropdownChange}>
                <option>Open this select menu</option>
                <option value="alphabetical">Alphabetical</option>
                <option value="playtime">Playtime</option>
                <option value="lastPlayed">Last played</option>
              </Form.Select>
            </div>
            <div className="mb-3 mt-1">
              <Form.Select ref={orderDropdown} aria-label="Default select example"
                value={order}
                onChange={HandleOrderDropdownChange}>
                <option>Open this select menu</option>
                <option value="asc">Ascending</option>
                <option value="desc">Descending</option>
              </Form.Select>
            </div>
            <hr></hr>
            <div className="mb-3 mt-3">
              <Form.Check
                type="checkbox"
                label="Played only"
                value="playedOnly"
                checked={playedFilter}
                onChange={(e: any) => HandleRadioChange(e)}
              />
              <Form.Check
                type="checkbox"
                label="Unplayed only"
                value="unplayedOnly"
                checked={unplayedFilter}
                onChange={(e: any) => HandleRadioChange(e)}
              />
              <Form.Check
                type="checkbox"
                label="Favourites only"
                value="favouritesOnly"
                checked={favouritesFilter}
                onChange={(e: any) => HandleRadioChange(e)}
              />
            </div>
          </Form>
        </Collapse>
      </Container>
    )
  }

  useEffect(() => {
    const lsDatabaseAddress = localStorage.getItem("databaseAddress");
    const lsNotifications = localStorage.getItem("showNotifications");
    lsNotifications === null ? setShowNotifications(true) : setShowNotifications(lsNotifications === 'true');
    FetchData();
  }, [])

  useEffect(() => {
    document.documentElement.setAttribute("data-bs-theme", theme);
  }, [theme]);

  useEffect(() => {
    window.localStorage.setItem('alphabeticalSort', alphabeticalSort);
    BuildAlert("Filters changed", "Applying new filters", "primary");
  }, [alphabeticalSort]);

  useEffect(() => {
    window.localStorage.setItem('playtimeSort', playtimeSort);
    BuildAlert("Filters changed", "Applying new filters", "primary");
  }, [playtimeSort]);

  useEffect(() => {
    window.localStorage.setItem('lastPlayedSort', lastPlayedSort);
    BuildAlert("Filters changed", "Applying new filters", "primary");
  }, [lastPlayedSort]);

  useEffect(() => {
    window.localStorage.setItem('ascSort', ascendingSort);
    BuildAlert("Filters changed", "Applying new filters", "primary");
  }, [ascendingSort]);

  useEffect(() => {
    window.localStorage.setItem('descSort', descendingSort);
    BuildAlert("Filters changed", "Applying new filters", "primary");
  }, [descendingSort]);

  useEffect(() => {
    window.localStorage.setItem('playedOnly', playedFilter);
    BuildAlert("Filters changed", "Applying new filters", "primary");
  }, [playedFilter]);

  useEffect(() => {
    window.localStorage.setItem('unplayedOnly', unplayedFilter);
    BuildAlert("Filters changed", "Applying new filters", "primary");
  }, [unplayedFilter]);

  useEffect(() => {
    window.localStorage.setItem('favouritesOnly', favouritesFilter);
    BuildAlert("Filters changed", "Applying new filters", "primary");
  }, [favouritesFilter]);

  useEffect(() => {
    console.log("Dropdown menu changed!");
    console.log(sort);
  }, [sort]);

  useEffect(() => {
    console.log("Dropdown menu changed!");
    console.log(order);
  }, [order]);

  useEffect(() => {
    FetchData();
  }, [
    databaseAddress,
    alphabeticalSort,
    playtimeSort,
    lastPlayedSort,
    ascendingSort,
    descendingSort,
    playedFilter,
    unplayedFilter,
    favouritesFilter
  ]);

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
              {<RadioButtons />}
              {isLoading && <Loading />}
              {stats && <StatsModal />}
              {games && <GameList list={games} />}
              {<SettingsModal />}
              {<FiltersModal />}
              {<ShowAlert />}
            </Suspense>
          </Col>
        </Container>
      </Container>
    </Container>

  );

}

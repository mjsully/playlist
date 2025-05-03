import { useEffect, useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import Container from '@mui/material/Container'
import Grid from '@mui/material/Grid'
import Card from '@mui/material/Card'
import CardMedia from '@mui/material/CardMedia'
import Typography from '@mui/material/Typography'
import FavoriteIcon from '@mui/icons-material/Favorite';
import { CardActions, CardContent, CircularProgress, FormControl, IconButton, InputLabel, MenuItem, Rating, Select } from '@mui/material'

function App() {
  const [count, setCount] = useState(0)
  const [userStatusData, setUserStatusData] = useState(null)
  const [userData, setUserData] = useState(null)
  const [order, setOrder] = useState("desc")
  const [sort, setSort] = useState("playtime")

  async function fetchUserStatusData() {
    try {
      const results = await fetch("http://192.168.1.227:8001/steam/user/status")
      if (!results.ok) {
        console.log("Error")
      }
      const json = await results.json()
      setUserStatusData(json)
      console.log(json)
    } catch (error) {
      console.log(error)
    }
  }
  async function fetchUserData() {
    try {
      const results = await fetch("http://192.168.1.227:8001/steam/games?order=" + order + "&sort=" + sort)
      if (!results.ok) {
        console.log("Error")
      }
      const json = await results.json()
      setUserData(json)
      console.log(json)
    } catch (error) {
      console.log(error)
    }
  }

  function FiltersAndSelectors() {
    return (
        <Grid container spacing={2}>
          <Grid size={4}>
            <FormControl fullWidth>
            <InputLabel id="demo-simple-select-label">Order</InputLabel>
              <Select
                labelId="demo-simple-select-label"
                id="demo-simple-select"
                value={order}
                label="Order"
                onChange={(event) => setOrder(event.target.value)}
              >
                <MenuItem value={"desc"}>Descending</MenuItem>
                <MenuItem value={"asc"}>Ascending</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid size={4}>
            <FormControl fullWidth>
            <InputLabel id="demo-simple-select-label-2">Sort</InputLabel>
            <Select
              labelId="demo-simple-select-label-2"
              id="demo-simple-select"
              value={sort}
              label="Sort"
              onChange={(event) => setSort(event.target.value)}
            >
              <MenuItem value={"playtime"}>Playtime</MenuItem>
              <MenuItem value={"alphabetical"}>Alphabetical (A-Z)</MenuItem>
            </Select>
          </FormControl>
          </Grid>
        </Grid>
    )
  }

  function ProcessGameData() {
    return (
      <Grid container spacing={2}>
        {userData.map(x => 

          <>
          <Grid size={{sm: 6, md: 4, lg: 3}}>
            <Card variant="outlined">
              <CardMedia
                sx={{ height: 150 }}
                image={x.img}
                title={x.name}
              />
              <CardContent>
                <Typography gutterBottom variant="h5" component="div">
                  {x.name}
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  Playtime: {Math.round(x.playtime_forever / 60)} hours
                </Typography>
              </CardContent>
              {/* <CardActions>
                <Button size="small">Share</Button>
                <Button size="small">Learn More</Button>
              </CardActions> */}
              {/* <Rating
                name="simple-controlled"
                onChange={(event) => {
                  console.log("New rating");
                }} */}
              {/* /> */}
              <CardActions>
                <IconButton aria-label="add to favorites">
                  <FavoriteIcon />
                </IconButton>
              </CardActions>
            </Card>
          </Grid>
          </>
        )}
      </Grid>

    )
  }

  useEffect(() => {
    setUserData(null)
    fetchUserData()
  }, [
    order,
    sort
  ])

  useEffect(() => {
    fetchUserStatusData()
    fetchUserData()
  }, [])

  return (
    <>
      <FiltersAndSelectors/>
      {!userData && <CircularProgress />}
      {userData && 
        <Container>
          <ProcessGameData/>
        </Container>}
    </>
  )
}

export default App

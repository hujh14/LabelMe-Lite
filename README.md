# LabelMe-Lite

Startup as well as several other operations are very slow because annotations are painted pixel by pixel. This could be made faster be directly writing to the canvas data. TODO!!!

A barebones Node.js app using [Express 4](http://expressjs.com/).
Extensively uses [Paper.js](http://paperjs.org/)

![Screenshot of annotation tool](public/images/screenshot.png)

## Running Locally

Make sure you have [Node.js](http://nodejs.org/) and the [Heroku Toolbelt](https://toolbelt.heroku.com/) installed.

```sh
Need cocoapi, nodejs, bower

git clone https://github.com/hujh14/LabelMe-Lite.git # or clone your own fork
cd LabelMe-Lite
npm install
bower install
sh setup_datasets.sh
npm start
```

Your app should now be running on [localhost:3000](http://localhost:3000/).

## Deploying to Heroku

```
heroku create
git push heroku master
heroku open
```

Alternatively, you can deploy your own copy of the app using the web-based flow:

[![Deploy to Heroku](https://www.herokucdn.com/deploy/button.png)](https://heroku.com/deploy)

## Documentation

For more information about using Node.js on Heroku, see these Dev Center articles:

- [10 Habits of a Happy Node Hacker](https://blog.heroku.com/archives/2014/3/11/node-habits)
- [Getting Started with Node.js on Heroku](https://devcenter.heroku.com/articles/getting-started-with-nodejs)
- [Heroku Node.js Support](https://devcenter.heroku.com/articles/nodejs-support)
- [Node.js on Heroku](https://devcenter.heroku.com/categories/nodejs)
- [Using WebSockets on Heroku with Node.js](https://devcenter.heroku.com/articles/node-websockets)
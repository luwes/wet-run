import { html } from './utils.js';

export default (props) => html`<!DOCTYPE html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1, user-scalable=no">
    <style>
      body {
        margin: 0;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Helvetica Neue", sans-serif;
        user-select: none;
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        display: flex;
        flex-direction: column;
      }

      main,
      section {
        display: flex;
        justify-content: center;
        align-items: center;
        flex-direction: column;
      }

      main {
        height: 100%;
      }

      section span {
        font-size: 24px;
        font-weight: 500;
        display: block;
        border-bottom: 1px solid #EAEAEA;
        text-align: center;
        padding-bottom: 20px;
        width: 100px;
      }

      section p {
        font-size: 14px;
        font-weight: 400;
      }

      section span + p {
        margin: 20px 0 0 0;
      }

      @media (min-width: 768px) {
        section {
          height: 40px;
          flex-direction: row;
        }

        section span,
        section p {
          height: 100%;
          line-height: 40px;
        }

        section span {
          border-bottom: 0;
          border-right: 1px solid #EAEAEA;
          padding: 0 20px 0 0;
          width: auto;
        }

        section span + p {
          margin: 0;
          padding-left: 20px;
        }
      }
    </style>
  </head>
  <body>
    <main>
      <section>
        <span>${props.statusCode}</span>
        <p>${props.message}</p>
      </section>
    </main>
  </body>
`;

const { Consumer } = require('sqs-consumer');
const AWS = require('aws-sdk');
const mariadb = require('mariadb');
const dayjs = require('dayjs');
const customParseFormat = require('dayjs/plugin/customParseFormat');
const { mysql, queueUrl } = require('/home/ubuntu/alert-worker/config.js');

dayjs.extend(customParseFormat);

AWS.config.loadFromPath('/home/ubuntu/alert-worker/credentials.json');

const pool = mariadb.createPool(mysql);

const app = Consumer.create({
    queueUrl,
    messageAttributeNames: ['All'],
    handleMessage: async (message) => {
        const sqlPool = await pool.getConnection();
        await sqlPool.query('SELECT 1 AS val');
        const _message = message.Body;
        const action = message.MessageAttributes.Action.StringValue;
        const coordinates = JSON.parse(message.MessageAttributes.Coordinates.StringValue);
        const eventEnd = message.MessageAttributes.EventEndTime.StringValue;
        const eventStart = message.MessageAttributes.EventStartTime.StringValue;
        const eventTrackingNumber = message.MessageAttributes.EventTrackingNumber.StringValue;
        const officeId = message.MessageAttributes.OfficeID.StringValue;
        const phenomena = message.MessageAttributes.Phenomena.StringValue;
        const productClass = message.MessageAttributes.ProductClass.StringValue;
        const significance = message.MessageAttributes.Significance.StringValue;

        const coords = coordinates.map(c => c.reverse());
        const res = await sqlPool.query('INSERT INTO alerts(action, coordinates, eventEnd, eventStart, eventTrackingNumber, officeId, phenomena, productClass, significance, message) VALUE (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [action, JSON.stringify(coords), dayjs(eventEnd, 'YYMMDD[T]HHmm[Z]').format('YYYY-MM-DD HH:mm:ss'), dayjs(eventStart, 'YYMMDD[T]HHmm[Z]').format('YYYY-MM-DD HH:mm:ss'), eventTrackingNumber, officeId, phenomena, productClass, significance, _message]
        );
	}
});

app.on('error', (err) => {
	console.error(err.message);
});

app.on('processing_error', (err) => {
	console.error(err.message);
});

app.on('timeout_error', (err) => {
	console.error(err.message);
});

app.start();
var _ = require('lodash');
var traverse = require('traverse');
var queryBuilder = {};

queryBuilder._addTableName = function(query, tableName) {
  query.TableName = tableName;
  return query;
};

queryBuilder._addDynamoOperation = function(query, operation) {
  return _.merge(query, operation);
};

queryBuilder._stringHasPlaceholders = function(stringValue) {
  const regex = /\{\{([a-zA-Z]\w*)\}\}/;
  return _.isString(stringValue) && stringValue.match(regex) != null;
};

queryBuilder._stringIsPlaceholder = function(stringValue) {
  const regex = /^\{\{([a-zA-Z]\w*)\}\}$/;
  var match = regex.exec(stringValue);

  if (match != null) {
    return match[1];
  }

  return false;
};

queryBuilder._substitutePlaceholders = function(value, model) {
  var replacementKey = queryBuilder._stringIsPlaceholder(value);
  if (replacementKey) return model[replacementKey];

  const regex = /\{\{([a-zA-Z]\w*)\}\}/g;
  var match;
  while ((match = regex.exec(value)) !== null) {
    var keyName = match[1];
    value = value.replace(new RegExp(`\{\{${keyName}\}\}`), model[keyName]);
  }

  return value;
};

queryBuilder._cleanFromNonDynamoData = function(query) {
  const nonDynamoFields = ["_type"];
  return _.omit(query, nonDynamoFields);
};

queryBuilder.fillPlaceholders = function(query, model) {
  traverse(query).forEach(function(value) {
    if (_.isFunction(value)) {
      this.update(value(model));
    }

    if (queryBuilder._stringHasPlaceholders(value)) {
      this.update(queryBuilder._substitutePlaceholders(value, model));
    }
  });

  return query;
};

queryBuilder.build = function(tableName, operationTemplate, model) {
  var buildDynamoQuery = _.flow(
    _.partialRight(queryBuilder._addTableName, tableName),
    _.partialRight(queryBuilder._addDynamoOperation, operationTemplate),
    _.partialRight(queryBuilder.fillPlaceholders, model),

    queryBuilder._cleanFromNonDynamoData);

  var initialQuery = {};
  return buildDynamoQuery(initialQuery);
};


module.exports = queryBuilder;
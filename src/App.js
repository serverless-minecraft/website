import React, { Component } from 'react';
import Amplify from 'aws-amplify';
import { Auth } from 'aws-amplify';
import ECS from 'aws-sdk/clients/ecs';
import { withAuthenticator } from 'aws-amplify-react';
import logo from './logo.svg';
import './App.css';

const REGION = 'ap-southeast-2';

Amplify.configure({
    Auth: {
        region: REGION,
        userPoolId: 'ap-southeast-2_UVBDKv0Kf',
        identityPoolId: 'ap-southeast-2:c3b41c7f-e449-43cc-9ab2-40652d89f127',
        userPoolWebClientId: '7s6p2evjkmqkp2ckruh1ffasp3'
    }
});

class Toggle extends React.Component {
  constructor(props) {
    super(props);
    this.state = {isToggleOn: props.running, buttonText: props.running ? 'RUNNING' : this.props.launchType};

    // This binding is necessary to make `this` work in the callback
    this.handleClick = this.handleClick.bind(this);
  }

  handleClick() {
    if (!this.state.isToggleOn) {
      this.setState(prevState => ({
        isToggleOn: true,
        buttonText: this.props.launchType
      }));
      Auth.currentCredentials()
        .then(credentials => {
        const ecs = new ECS({
          credentials: Auth.essentialCredentials(credentials),
          region: REGION
        });
        ecs.runTask({
          cluster: 'minecraft-cluster',
          taskDefinition: this.props.id + '-' + this.props.launchType,
          launchType: this.props.launchType,
          networkConfiguration: {
            awsvpcConfiguration: {
              subnets: ['subnet-041a86dd8c48083f1', 'subnet-08fdafbe8e4e2637c'],
              assignPublicIp: 'ENABLED'
            }
          }
        }).promise()
          .then(data => {
            this.setState({buttonText: 'RUNNING'});
          })
          .catch(data => {
            this.setState({
              isToggleOn: false,
              buttonText: 'ERROR'
            });
            alert(data);
          });
      });
    }
  }

  render() {
    return (
      <button onClick={this.handleClick} id={this.props.id}>
        {this.state.buttonText}
      </button>
    );
  }
}

class Servers extends Component {
  constructor(props) {
    super(props);
    this.state = { running: [], available: [], error: null };
  }
  
  componentDidMount() {
    Auth.currentCredentials()
      .then(credentials => {
        const ecs = new ECS({
          credentials: Auth.essentialCredentials(credentials),
          region: REGION
        });
        ecs.listTasks({
          cluster: 'minecraft-cluster',
          desiredStatus: 'RUNNING'
        }).promise()
          .then(data => {
            ecs.describeTasks({
              cluster: 'minecraft-cluster',
              tasks: data.taskArns
            }).promise()
            .then(descs => {
              this.setState({ running: descs.tasks.map(task => task.group.replace('-FARGATE', '').replace('task:', '').replace('family:', '')) });
            });
            ecs.listTaskDefinitionFamilies({ status: 'ACTIVE' }).promise()
              .then(data => this.setState({ available: data.families.map(family => family.replace('-FARGATE', '')) }))
              .catch(error => this.setState({ error: error }));
          })
          .catch(error => this.setState({ error: error }));
      });
  }
  
  render() {
    if (this.state.error) {
      return <p>Error: {this.state.error}</p>;
    }
    return (
      <div>
        Servers:<br />
        {this.state.available.map(family => {
          return <div>{family} <Toggle id={family} running={this.state.running.some(item => family === item)} launchType="FARGATE" /><Toggle id={family} running={this.state.running.som(item => family === item)} launchType="EC2" /></div>;
        })}
      </div>
    );
  }
}

class App extends Component {
  constructor(props) {
    super(props);
    this.state = { data: [], error: null, servers: [] };
  }
  
  storeRunning(servers) {
    this.setState({ servers: servers });
  }
  
  render() {
    return (
      <div className="App">
        <header className="App-header">
          <img src={logo} className="App-logo" alt="logo" />
          <h1 className="App-title">Minecraft Manager</h1>
        </header>
        <p className="App-intro">
          <Servers />
        </p>
      </div>
    );
  }
}

export default withAuthenticator(App, { includeGreetings: true });

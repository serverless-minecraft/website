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
    this.state = {isToggleOn: false, buttonText: 'LAUNCH'};

    // This binding is necessary to make `this` work in the callback
    this.handleClick = this.handleClick.bind(this);
  }

  handleClick() {
    if (!this.state.isToggleOn) {
      this.setState(prevState => ({
        isToggleOn: true,
        buttonText: 'LAUNCHING'
      }));
      Auth.currentCredentials()
        .then(credentials => {
        const ecs = new ECS({
          credentials: Auth.essentialCredentials(credentials),
          region: REGION
        });
        ecs.runTask({
          cluster: 'minecraft-cluster',
          taskDefinition: this.props.id,
          launchType: 'FARGATE',
          networkConfiguration: {
            awsvpcConfiguration: {
              subnets: ['subnet-24281f43', 'subnet-4e456507'],
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

class RunningServers extends Component {
  constructor(props) {
    super(props);
    this.state = { data: [], error: null };
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
              this.setState({ data: descs.tasks });
              this.props.storeRunning(descs.tasks);
            });
          })
          .catch(error => this.setState({ error: error }))
      });
  }

  render() {
    if (this.state.error) {
      return <p>Error: {this.state.error}</p>;
    }
    return (
      <div>
        Running Servers:
        <ul>
          {this.state.data.map(task => (
            <li>{task.group.replace('-FARGATE', '').replace('task:', '')}</li>
          ))}
        </ul>
      </div>
    );
  }
}

class AvailableServers extends Component {
  constructor(props) {
    super(props);
    this.state = { data: [], error: null, running: props.servers };
  }

  componentDidMount() {
    Auth.currentCredentials()
      .then(credentials => {
        const ecs = new ECS({
          credentials: Auth.essentialCredentials(credentials),
          region: REGION
        });
        ecs.listTaskDefinitionFamilies({ status: 'ACTIVE' }).promise()
          .then(data => this.setState({ data: data.families }))
          .catch(error => this.setState({ error: error }));
      })
  }

  render() {
    if (this.state.error) {
      return <p>Error: {this.state.error}</p>;
    }
    return (
      <div>
        Available Servers:<br />
        {this.state.data.map(family => {
          // if family not in props.servers statement here
          return <div>{family.replace('-FARGATE', '')} <Toggle id={family} /></div>
          })}
      </div>
    );
  }
}

class App extends Component {
  constructor(props) {
    super(props);
    this.state = { data: [], error: null };
  }
  
  storeRunning(servers) {
    this.setState({ servers: servers })
  }
  
  render() {
    return (
      <div className="App">
        <header className="App-header">
          <img src={logo} className="App-logo" alt="logo" />
          <h1 className="App-title">Minecraft Manager</h1>
        </header>
        <p className="App-intro">
          <RunningServers storeRunning={this.storeRunning} />
          <AvailableServers running={this.state.servers} />
        </p>
      </div>
    );
  }
}

export default withAuthenticator(App, { includeGreetings: true });
